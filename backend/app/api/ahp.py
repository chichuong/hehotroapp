from typing import Dict, List, Optional, Set, Tuple

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

FIXED_AHP_CRITERIA = [
    {
        "code": "price",
        "name": "Giá",
        "description": "Giá bất động sản - thấp hơn là tốt hơn",
        "sort_order": 1,
    },
    {
        "code": "distance",
        "name": "Khoảng cách",
        "description": "Khoảng cách tới trung tâm - gần hơn là tốt hơn",
        "sort_order": 2,
    },
    {
        "code": "rooms",
        "name": "Số phòng",
        "description": "Tổng số phòng - nhiều hơn là tốt hơn",
        "sort_order": 3,
    },
    {
        "code": "bedrooms",
        "name": "Số phòng ngủ",
        "description": "Số lượng phòng ngủ - nhiều hơn là tốt hơn",
        "sort_order": 4,
    },
    {
        "code": "year_built",
        "name": "Năm xây dựng",
        "description": "Năm xây dựng công trình - mới hơn là tốt hơn",
        "sort_order": 5,
    },
]
AHP_CRITERIA_CODES = {item["code"] for item in FIXED_AHP_CRITERIA}


def _get_primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _get_or_create_ahp_criteria(db: Session) -> List[Criteria]:
    """Return the fixed 5 AHP criteria, creating or updating them if needed."""
    existing = (
        db.query(Criteria)
        .filter(Criteria.code.in_(AHP_CRITERIA_CODES))
        .all()
    )
    by_code = {c.code: c for c in existing}

    dirty = False
    for item in FIXED_AHP_CRITERIA:
        c = by_code.get(item["code"])
        if c is None:
            c = Criteria(
                code=item["code"],
                name=item["name"],
                description=item["description"],
                is_active=True,
                sort_order=item["sort_order"],
            )
            db.add(c)
            by_code[item["code"]] = c
            dirty = True
            continue

        changed = False
        if c.name != item["name"]:
            c.name = item["name"]
            changed = True
        if c.description != item["description"]:
            c.description = item["description"]
            changed = True
        if c.sort_order != item["sort_order"]:
            c.sort_order = item["sort_order"]
            changed = True
        if c.is_active is not True:
            c.is_active = True
            changed = True
        dirty = dirty or changed

    if dirty:
        db.flush()

    refreshed = (
        db.query(Criteria)
        .filter(Criteria.code.in_(AHP_CRITERIA_CODES), Criteria.is_active == True)
        .all()
    )
    by_code = {c.code: c for c in refreshed}
    return [by_code[item["code"]] for item in FIXED_AHP_CRITERIA if item["code"] in by_code]


def _validate_pairwise_entries(
    entries: List[AHPMatrixEntry],
    criteria_ids: List[int],
) -> Tuple[bool, str]:
    """Validate that entries represent exactly one upper-triangle value per criterion pair."""
    criteria_set: Set[int] = set(criteria_ids)
    n = len(criteria_ids)
    expected_pairs = n * (n - 1) // 2

    if len(entries) != expected_pairs:
        return False, f"Ma trận phải có đúng {expected_pairs} cặp so sánh cho {n} tiêu chí."

    seen_pairs: Set[Tuple[int, int]] = set()
    for entry in entries:
        row_id = entry.criteria_id_row
        col_id = entry.criteria_id_col

        if row_id == col_id:
            return False, "Không được so sánh một tiêu chí với chính nó."
        if row_id not in criteria_set or col_id not in criteria_set:
            return False, "Ma trận chỉ được dùng 5 tiêu chí AHP cố định."
        if abs(entry.value - round(entry.value)) > 1e-9:
            return False, "Giá trị so sánh phải là số nguyên từ 1 đến 9."
        if entry.value < 1 or entry.value > 9:
            return False, "Giá trị so sánh phải nằm trong khoảng 1 đến 9."

        pair = (min(row_id, col_id), max(row_id, col_id))
        if pair in seen_pairs:
            return False, "Mỗi cặp tiêu chí chỉ được nhập một lần."
        seen_pairs.add(pair)

    expected_set: Set[Tuple[int, int]] = set()
    for i in range(n):
        for j in range(i + 1, n):
            pair = (min(criteria_ids[i], criteria_ids[j]), max(criteria_ids[i], criteria_ids[j]))
            expected_set.add(pair)

    if seen_pairs != expected_set:
        return False, "Thiếu một số cặp so sánh tiêu chí bắt buộc."

    return True, "OK"


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

    criteria_list = _get_or_create_ahp_criteria(db)
    criteria_ids = [c.id for c in criteria_list]

    if len(criteria_ids) != 5:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đủ 5 tiêu chí AHP cố định.",
        )

    is_valid, message = _validate_pairwise_entries(entries, criteria_ids)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Ma trận AHP hiện tại không hợp lệ với bộ 5 tiêu chí cố định. "
                f"{message}"
            ),
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
        return AHPMatrixResponse(
            id=0,
            user_id=user.id,
            entries=[],
            created_at=None,
            updated_at=None,
        )

    criteria_list = _get_or_create_ahp_criteria(db)
    criteria_ids = [c.id for c in criteria_list]

    entries = (
        db.query(AHPMatrixEntry)
        .filter(AHPMatrixEntry.matrix_id == matrix.id)
        .order_by(AHPMatrixEntry.criteria_id_row, AHPMatrixEntry.criteria_id_col)
        .all()
    )

    is_valid, message = _validate_pairwise_entries(entries, criteria_ids)
    if not is_valid:
        # Return placeholder instead of 404 so frontend can continue bootstrapping.
        return AHPMatrixResponse(
            id=matrix.id,
            user_id=matrix.user_id,
            entries=[],
            created_at=matrix.created_at,
            updated_at=matrix.updated_at,
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

    criteria_list = _get_or_create_ahp_criteria(db)
    criteria_ids = [c.id for c in criteria_list]

    if len(criteria_ids) != 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Không tìm thấy đủ 5 tiêu chí AHP cố định trong hệ thống.",
        )

    # Validate full 5x5 pairwise structure (upper triangle only).
    temp_entries = [
        AHPMatrixEntry(
            criteria_id_row=entry.criteria_id_row,
            criteria_id_col=entry.criteria_id_col,
            value=entry.value,
        )
        for entry in data.entries
    ]
    is_valid, message = _validate_pairwise_entries(temp_entries, criteria_ids)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
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

    # Add entries (store one value per unordered pair).
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
        .order_by(AHPMatrixEntry.criteria_id_row, AHPMatrixEntry.criteria_id_col)
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
        message = "Mức độ nhất quán chưa tốt. Bạn nên điều chỉnh lại một số giá trị."

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
    try:
        ahp_result, criteria_list = _get_user_weights(db, user)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            return RankingResponse(items=[], total=0)
        raise
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
