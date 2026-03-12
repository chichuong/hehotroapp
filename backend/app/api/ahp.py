import math
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.security import require_current_user
from app.models.user import User
from app.models.property import Property
from app.models.property_image import PropertyImage
from app.models.criteria import Criteria
from app.models.ahp_matrix import AHPMatrix
from app.models.ahp_matrix_entry import AHPMatrixEntry
from app.models.property_ahp_score import PropertyAHPScore
from app.schemas.ahp import (
    AHPMatrixInput,
    AHPMatrixResponse,
    AHPMatrixEntryResponse,
    AHPWeightsResponse,
    AHPConsistencyResponse,
    PropertyAHPScoreResponse,
    RankingResponse,
    RankedPropertyItem,
    CriteriaWeight,
    CriteriaBreakdownItem,
)
from app.services.ahp_service import compute_ahp_weights, RI_TABLE, CR_THRESHOLD
from app.services.property_scoring_service import (
    normalize_property_features,
    calculate_ahp_property_score,
    get_summary_label,
    SCORABLE_CRITERIA_CODES,
)

router = APIRouter()

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"


def _get_primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _get_active_criteria(db: Session) -> List[Criteria]:
    return (
        db.query(Criteria)
        .filter(Criteria.is_active == True)
        .order_by(Criteria.sort_order)
        .all()
    )


def _get_user_matrix(db: Session, user_id: int) -> Optional[AHPMatrix]:
    return (
        db.query(AHPMatrix)
        .filter(AHPMatrix.user_id == user_id)
        .order_by(AHPMatrix.updated_at.desc())
        .first()
    )


def _get_user_weights(db: Session, user: User):
    """Helper: compute AHP weights for a user. Returns (ahp_result, criteria_list) or raises 404."""
    matrix = _get_user_matrix(db, user.id)
    if not matrix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa thiết lập ma trận so sánh AHP.",
        )

    entries = (
        db.query(AHPMatrixEntry)
        .filter(AHPMatrixEntry.matrix_id == matrix.id)
        .all()
    )

    criteria_list = _get_active_criteria(db)
    # Only use criteria that appear in the matrix entries
    entry_criteria_ids = set()
    for e in entries:
        entry_criteria_ids.add(e.criteria_id_row)
        entry_criteria_ids.add(e.criteria_id_col)
    criteria_list = [c for c in criteria_list if c.id in entry_criteria_ids]
    criteria_ids = [c.id for c in criteria_list]

    if not criteria_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tiêu chí nào trong ma trận AHP.",
        )

    ahp_result = compute_ahp_weights(entries, criteria_ids)
    return ahp_result, criteria_list


# ============================================================
# AHP Matrix Endpoints
# ============================================================

@router.get("/ahp/matrix", response_model=AHPMatrixResponse)
def get_ahp_matrix(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    matrix = _get_user_matrix(db, user.id)
    if not matrix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa thiết lập ma trận so sánh AHP.",
        )

    entries = (
        db.query(AHPMatrixEntry)
        .filter(AHPMatrixEntry.matrix_id == matrix.id)
        .all()
    )

    return AHPMatrixResponse(
        id=matrix.id,
        user_id=matrix.user_id,
        entries=[
            AHPMatrixEntryResponse(
                criteria_id_row=e.criteria_id_row,
                criteria_id_col=e.criteria_id_col,
                value=e.value,
            )
            for e in entries
        ],
        created_at=matrix.created_at,
        updated_at=matrix.updated_at,
    )


@router.post("/ahp/matrix", response_model=AHPMatrixResponse, status_code=status.HTTP_201_CREATED)
def create_ahp_matrix(
    data: AHPMatrixInput,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    # Validate entries
    if not data.entries:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cần ít nhất một cặp so sánh tiêu chí.",
        )

    # Validate criteria exist
    criteria_ids_in_entries = set()
    for entry in data.entries:
        criteria_ids_in_entries.add(entry.criteria_id_row)
        criteria_ids_in_entries.add(entry.criteria_id_col)

    valid_criteria = (
        db.query(Criteria)
        .filter(Criteria.id.in_(criteria_ids_in_entries), Criteria.is_active == True)
        .all()
    )
    valid_ids = {c.id for c in valid_criteria}
    invalid_ids = criteria_ids_in_entries - valid_ids
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tiêu chí không hợp lệ: {list(invalid_ids)}",
        )

    # Delete existing matrix for user (replace strategy)
    existing = _get_user_matrix(db, user.id)
    if existing:
        db.delete(existing)
        db.flush()

    # Create new matrix
    matrix = AHPMatrix(user_id=user.id)
    db.add(matrix)
    db.flush()

    # Add entries (store upper triangle)
    for entry in data.entries:
        db_entry = AHPMatrixEntry(
            matrix_id=matrix.id,
            criteria_id_row=entry.criteria_id_row,
            criteria_id_col=entry.criteria_id_col,
            value=entry.value,
        )
        db.add(db_entry)

    # Clear cached scores for this user
    db.query(PropertyAHPScore).filter(PropertyAHPScore.user_id == user.id).delete()

    db.commit()
    db.refresh(matrix)

    entries = (
        db.query(AHPMatrixEntry)
        .filter(AHPMatrixEntry.matrix_id == matrix.id)
        .all()
    )

    return AHPMatrixResponse(
        id=matrix.id,
        user_id=matrix.user_id,
        entries=[
            AHPMatrixEntryResponse(
                criteria_id_row=e.criteria_id_row,
                criteria_id_col=e.criteria_id_col,
                value=e.value,
            )
            for e in entries
        ],
        created_at=matrix.created_at,
        updated_at=matrix.updated_at,
    )


@router.put("/ahp/matrix", response_model=AHPMatrixResponse)
def update_ahp_matrix(
    data: AHPMatrixInput,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    # Same logic as create — replace the matrix
    return create_ahp_matrix(data, user, db)


# ============================================================
# AHP Weights Endpoint
# ============================================================

@router.get("/ahp/weights", response_model=AHPWeightsResponse)
def get_ahp_weights(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    ahp_result, criteria_list = _get_user_weights(db, user)
    criteria_map = {c.id: c for c in criteria_list}

    weights_list = []
    for cid, weight in ahp_result["weights"].items():
        c = criteria_map.get(cid)
        if c:
            weights_list.append(CriteriaWeight(
                criteria_id=c.id,
                criteria_code=c.code,
                criteria_name=c.name,
                weight=weight,
            ))

    return AHPWeightsResponse(
        weights=weights_list,
        lambda_max=ahp_result["lambda_max"],
        ci=ahp_result["ci"],
        cr=ahp_result["cr"],
        is_consistent=ahp_result["is_consistent"],
    )


# ============================================================
# AHP Consistency Endpoint
# ============================================================

@router.get("/ahp/consistency", response_model=AHPConsistencyResponse)
def get_ahp_consistency(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    ahp_result, criteria_list = _get_user_weights(db, user)
    n = len(criteria_list)
    ri = RI_TABLE.get(n, 1.45)

    if ahp_result["is_consistent"]:
        message = "Ma trận so sánh nhất quán. Kết quả đáng tin cậy."
    else:
        message = (
            "Mức độ nhất quán của các so sánh tiêu chí chưa tốt. "
            "Bạn nên điều chỉnh lại một số lựa chọn."
        )

    return AHPConsistencyResponse(
        lambda_max=ahp_result["lambda_max"],
        ci=ahp_result["ci"],
        cr=ahp_result["cr"],
        ri=ri,
        is_consistent=ahp_result["is_consistent"],
        n=n,
        message=message,
    )


# ============================================================
# Property AHP Score Endpoint
# ============================================================

@router.get("/properties/{property_id}/ahp-score", response_model=PropertyAHPScoreResponse)
def get_property_ahp_score(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    prop = (
        db.query(Property)
        .options(joinedload(Property.images))
        .filter(Property.id == property_id)
        .first()
    )
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản.",
        )

    ahp_result, criteria_list = _get_user_weights(db, user)
    criteria_map = {c.id: c for c in criteria_list}
    criteria_code_to_id = {c.code: c.id for c in criteria_list}
    scorable_codes = [c.code for c in criteria_list if c.code in SCORABLE_CRITERIA_CODES]

    # Get all properties for normalization context
    all_properties = db.query(Property).all()
    normalized = normalize_property_features(all_properties, scorable_codes)
    prop_values = normalized.get(prop.id, {})

    total_score, breakdown = calculate_ahp_property_score(
        prop, ahp_result["weights"], prop_values, criteria_code_to_id
    )

    # Build response
    breakdown_items = []
    for code, contribution in breakdown.items():
        cid = criteria_code_to_id.get(code)
        c = criteria_map.get(cid) if cid else None
        weight = ahp_result["weights"].get(cid, 0.0) if cid else 0.0
        breakdown_items.append(CriteriaBreakdownItem(
            criteria_code=code,
            criteria_name=c.name if c else code,
            weight=weight,
            normalized_value=prop_values.get(code, 0.0),
            contribution=contribution,
        ))

    weights_list = []
    for cid, weight in ahp_result["weights"].items():
        c = criteria_map.get(cid)
        if c:
            weights_list.append(CriteriaWeight(
                criteria_id=c.id,
                criteria_code=c.code,
                criteria_name=c.name,
                weight=weight,
            ))

    return PropertyAHPScoreResponse(
        property_id=prop.id,
        score=total_score,
        summary_label=get_summary_label(total_score),
        criteria_breakdown=breakdown_items,
        weights_used=weights_list,
    )


# ============================================================
# Property Ranking Endpoint
# ============================================================

@router.get("/ranking", response_model=RankingResponse)
def get_property_ranking(
    limit: int = Query(20, ge=1, le=100),
    suburb: Optional[str] = Query(None, max_length=200),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    ahp_result, criteria_list = _get_user_weights(db, user)
    criteria_code_to_id = {c.code: c.id for c in criteria_list}
    scorable_codes = [c.code for c in criteria_list if c.code in SCORABLE_CRITERIA_CODES]

    # Build property query with filters
    query = db.query(Property).options(joinedload(Property.images))
    if suburb:
        query = query.filter(Property.suburb.ilike(f"%{suburb}%"))
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)

    all_properties = query.all()

    # Deduplicate (joinedload can cause duplicates)
    seen_ids = set()
    unique_properties = []
    for p in all_properties:
        if p.id not in seen_ids:
            seen_ids.add(p.id)
            unique_properties.append(p)
    all_properties = unique_properties

    if not all_properties:
        return RankingResponse(items=[], total=0)

    # Normalize all properties
    normalized = normalize_property_features(all_properties, scorable_codes)

    # Score each property
    scored = []
    for prop in all_properties:
        prop_values = normalized.get(prop.id, {})
        total_score, _ = calculate_ahp_property_score(
            prop, ahp_result["weights"], prop_values, criteria_code_to_id
        )
        scored.append((prop, total_score))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    # Limit results
    scored = scored[:limit]
    total = len(scored)

    items = []
    for rank, (prop, score) in enumerate(scored, start=1):
        items.append(RankedPropertyItem(
            rank=rank,
            property_id=prop.id,
            title=prop.title,
            address=prop.address,
            suburb=prop.suburb,
            price=prop.price,
            rooms=prop.rooms,
            bathrooms=prop.bathrooms,
            cars=prop.cars,
            property_type=prop.property_type,
            primary_image=_get_primary_image(prop),
            ahp_score=score,
            summary_label=get_summary_label(score),
        ))

    return RankingResponse(items=items, total=total)
