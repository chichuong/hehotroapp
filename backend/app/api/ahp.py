import math
from typing import Optional, List, Dict, Any

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
    AHPAlternativesResponse,
    AHPAlternativeProperty,
    AHPAlternativeRow,
)
from app.services.ahp_service import compute_ahp_weights, RI_TABLE, CR_THRESHOLD
from app.services.property_scoring_service import (
    normalize_property_features,
    normalize_ahp_alternatives,
    calculate_ahp_property_score,
    calculate_ahp_score_from_normalized,
    get_summary_label,
    SCORABLE_CRITERIA_CODES,
    AHP_CRITERIA_CODES,
)

router = APIRouter()

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"

# Number of alternatives for AHP
AHP_MAX_ALTERNATIVES = 5


def _get_primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _get_active_ahp_criteria(db: Session) -> List[Criteria]:
    """Load only the 5 fixed AHP criteria, in sort order."""
    return (
        db.query(Criteria)
        .filter(
            Criteria.is_active == True,
            Criteria.code.in_(AHP_CRITERIA_CODES),
        )
        .order_by(Criteria.sort_order)
        .all()
    )


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

    # Validate that all values are integers 1-9
    for entry in data.entries:
        val = entry.value
        if val < 1 or val > 9 or val != int(val):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Giá trị so sánh phải là số nguyên từ 1 đến 9 (nhận được: {val}).",
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
# AHP Alternatives Endpoint (New — Simplified 5×5 AHP)
# ============================================================

@router.get("/ahp/alternatives", response_model=AHPAlternativesResponse)
def get_ahp_alternatives(
    suburb: Optional[str] = Query(None, max_length=200),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """
    Compute the full AHP evaluation with 5 alternatives × 5 criteria.

    Selection strategy:
      1. Filter properties by suburb/price if provided.
      2. Take the first AHP_MAX_ALTERNATIVES (5) results.
    """
    # --- Get user's AHP criteria weights ---
    ahp_result, criteria_list = _get_user_weights(db, user)

    # Restrict to the 5 AHP criteria only
    ahp_criteria = _get_active_ahp_criteria(db)
    if len(ahp_criteria) < 5:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Hệ thống chưa có đủ 5 tiêu chí AHP. Vui lòng chạy migration.",
        )

    criteria_map = {c.id: c for c in ahp_criteria}
    criteria_code_map = {c.code: c for c in ahp_criteria}

    # Build weights keyed by code (only for AHP criteria)
    weights_by_code: Dict[str, float] = {}
    weights_list: List[CriteriaWeight] = []
    for cid, w in ahp_result["weights"].items():
        c = criteria_map.get(cid)
        if c and c.code in AHP_CRITERIA_CODES:
            weights_by_code[c.code] = w
            weights_list.append(CriteriaWeight(
                criteria_id=c.id,
                criteria_code=c.code,
                criteria_name=c.name,
                weight=w,
            ))

    # If we don't have weights for all 5 criteria from user's matrix,
    # use equal weights as fallback
    if len(weights_by_code) < len(AHP_CRITERIA_CODES):
        # Try to match by code from all criteria in ahp_result
        all_criteria_in_result = {c.id: c for c in criteria_list}
        for cid, w in ahp_result["weights"].items():
            c = all_criteria_in_result.get(cid)
            if c and c.code in AHP_CRITERIA_CODES and c.code not in weights_by_code:
                weights_by_code[c.code] = w
                if not any(ww.criteria_code == c.code for ww in weights_list):
                    db_c = criteria_code_map.get(c.code)
                    if db_c:
                        weights_list.append(CriteriaWeight(
                            criteria_id=db_c.id,
                            criteria_code=db_c.code,
                            criteria_name=db_c.name,
                            weight=w,
                        ))

    # Fallback equal weights for any missing AHP criteria
    missing = [code for code in AHP_CRITERIA_CODES if code not in weights_by_code]
    if missing:
        eq_w = round(1.0 / len(AHP_CRITERIA_CODES), 6)
        for code in missing:
            weights_by_code[code] = eq_w
            c = criteria_code_map.get(code)
            if c:
                weights_list.append(CriteriaWeight(
                    criteria_id=c.id,
                    criteria_code=c.code,
                    criteria_name=c.name,
                    weight=eq_w,
                ))

    # --- Select up to 5 property alternatives ---
    query = db.query(Property).options(joinedload(Property.images))
    if suburb:
        query = query.filter(Property.suburb.ilike(f"%{suburb}%"))
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)

    # Take first AHP_MAX_ALTERNATIVES properties (after deduplication)
    raw_props = query.limit(AHP_MAX_ALTERNATIVES * 3).all()

    # Deduplicate
    seen_ids: set = set()
    candidates: List[Property] = []
    for p in raw_props:
        if p.id not in seen_ids:
            seen_ids.add(p.id)
            candidates.append(p)
        if len(candidates) >= AHP_MAX_ALTERNATIVES:
            break

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản nào phù hợp với bộ lọc đã chọn.",
        )

    # --- Normalize candidates using AHP criteria ---
    normalized = normalize_ahp_alternatives(candidates)

    # --- Build alternative matrix rows ---
    alternative_rows: List[AHPAlternativeRow] = []
    for prop in candidates:
        norm_vals = normalized.get(prop.id, {})
        score = calculate_ahp_score_from_normalized(norm_vals, weights_by_code)
        alternative_rows.append(AHPAlternativeRow(
            property_id=prop.id,
            title=prop.title,
            values=norm_vals,
            ahp_score=score,
            rank=0,  # filled after sorting
            summary_label=get_summary_label(score),
        ))

    # --- Sort and rank ---
    alternative_rows.sort(key=lambda x: x.ahp_score, reverse=True)
    for rank_idx, row in enumerate(alternative_rows, start=1):
        row.rank = rank_idx

    # --- Build alternatives list ---
    prop_map = {p.id: p for p in candidates}
    alternatives = []
    for row in alternative_rows:
        prop = prop_map.get(row.property_id)
        if prop:
            alternatives.append(AHPAlternativeProperty(
                property_id=prop.id,
                title=prop.title,
                address=prop.address,
                suburb=prop.suburb,
                price=prop.price,
                rooms=prop.rooms,
                bedrooms=prop.bedrooms,
                year_built=prop.year_built,
                primary_image=_get_primary_image(prop),
            ))

    # --- Criteria list for response ---
    criteria_out = [
        {"code": c.code, "name": c.name, "description": c.description}
        for c in ahp_criteria
        if c.code in AHP_CRITERIA_CODES
    ]
    # Ensure ordering matches AHP_CRITERIA_CODES
    code_order = {code: i for i, code in enumerate(AHP_CRITERIA_CODES)}
    criteria_out.sort(key=lambda x: code_order.get(x["code"], 99))

    # --- Consistency message ---
    cr = ahp_result["cr"]
    is_consistent = ahp_result["is_consistent"]
    if is_consistent:
        consistency_message = "Ma trận so sánh nhất quán. Kết quả đáng tin cậy."
    else:
        consistency_message = (
            f"Mức độ nhất quán chưa tốt (CR = {cr * 100:.1f}%). "
            "Bạn nên điều chỉnh lại một số giá trị."
        )

    return AHPAlternativesResponse(
        criteria=criteria_out,
        criteria_weights=weights_list,
        alternatives=alternatives,
        alternative_matrix=alternative_rows,
        ranking=alternative_rows,  # already sorted
        lambda_max=ahp_result["lambda_max"],
        ci=ahp_result["ci"],
        cr=cr,
        is_consistent=is_consistent,
        consistency_message=consistency_message,
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
