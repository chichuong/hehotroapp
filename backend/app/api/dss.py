import json
import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sa_func

from app.db.session import get_db
from app.core.security import require_current_user
from app.models.user import User
from app.models.property import Property
from app.models.user_profile import UserProfile
from app.models.criteria import Criteria
from app.models.user_criteria_preference import UserCriteriaPreference
from app.models.property_dss_score import PropertyDSSScore
from app.schemas.dss import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    CriteriaResponse,
    CriteriaPreferenceResponse,
    CriteriaPreferencesUpdate,
    CriteriaPreferencesListResponse,
    PropertyFitResponse,
    PropertyDSSScoreResponse,
    DSSScoreBreakdown,
    RecommendedPropertyItem,
    RecommendationsResponse,
    RecommendationRefreshResponse,
    RecommendationsSummaryResponse,
    LabelCount,
    VALID_PRIORITY_LEVELS,
    PRIORITY_LEVEL_SCORE_MAP,
)
from app.schemas.phase7 import PropertyExplainabilityResponse
from app.services.dss_engine import calculate_property_fit
from app.services.explainability_service import build_property_explainability

router = APIRouter()


# --- User Profile Endpoints ---

@router.get("/profile", response_model=UserProfileResponse)
def get_dss_profile(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo mới.",
        )
    return profile


@router.post("/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_dss_profile(
    data: UserProfileCreate,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã có hồ sơ nhu cầu. Vui lòng sử dụng chức năng cập nhật.",
        )

    # Validate budget range
    if data.budget_min is not None and data.budget_max is not None:
        if data.budget_min > data.budget_max:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Ngân sách tối thiểu không được lớn hơn ngân sách tối đa.",
            )

    profile = UserProfile(user_id=user.id, **data.model_dump(exclude_unset=True))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=UserProfileResponse)
def update_dss_profile(
    data: UserProfileUpdate,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo mới trước.",
        )

    # Validate budget range
    update_data = data.model_dump(exclude_unset=True)
    budget_min = update_data.get("budget_min", profile.budget_min)
    budget_max = update_data.get("budget_max", profile.budget_max)
    if budget_min is not None and budget_max is not None:
        if budget_min > budget_max:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Ngân sách tối thiểu không được lớn hơn ngân sách tối đa.",
            )

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


# --- Criteria Endpoints ---

@router.get("/criteria", response_model=List[CriteriaResponse])
def list_criteria(db: Session = Depends(get_db)):
    criteria = (
        db.query(Criteria)
        .filter(Criteria.is_active == True)
        .order_by(Criteria.sort_order)
        .all()
    )
    return criteria


# --- User Criteria Preferences Endpoints ---

@router.get("/preferences", response_model=CriteriaPreferencesListResponse)
def get_user_preferences(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    prefs = (
        db.query(UserCriteriaPreference)
        .filter(UserCriteriaPreference.user_id == user.id)
        .join(Criteria)
        .order_by(Criteria.sort_order)
        .all()
    )
    items = []
    for p in prefs:
        items.append(CriteriaPreferenceResponse(
            id=p.id,
            criteria_id=p.criteria_id,
            criteria_code=p.criteria.code,
            criteria_name=p.criteria.name,
            priority_level=p.priority_level,
            priority_score=p.priority_score,
            updated_at=p.updated_at,
        ))
    return CriteriaPreferencesListResponse(preferences=items)


@router.put("/preferences", response_model=CriteriaPreferencesListResponse)
def update_user_preferences(
    data: CriteriaPreferencesUpdate,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    # Validate no duplicate criteria_ids
    criteria_ids = [item.criteria_id for item in data.preferences]
    if len(criteria_ids) != len(set(criteria_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Không được có tiêu chí trùng lặp trong danh sách.",
        )

    # Validate all criteria exist and are active
    valid_criteria = (
        db.query(Criteria)
        .filter(Criteria.id.in_(criteria_ids), Criteria.is_active == True)
        .all()
    )
    valid_ids = {c.id for c in valid_criteria}
    invalid_ids = set(criteria_ids) - valid_ids
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Các tiêu chí không hợp lệ: {list(invalid_ids)}",
        )

    # Upsert preferences
    for item in data.preferences:
        existing = (
            db.query(UserCriteriaPreference)
            .filter(
                UserCriteriaPreference.user_id == user.id,
                UserCriteriaPreference.criteria_id == item.criteria_id,
            )
            .first()
        )
        score = PRIORITY_LEVEL_SCORE_MAP.get(item.priority_level, 50.0)
        if existing:
            existing.priority_level = item.priority_level
            existing.priority_score = score
        else:
            pref = UserCriteriaPreference(
                user_id=user.id,
                criteria_id=item.criteria_id,
                priority_level=item.priority_level,
                priority_score=score,
            )
            db.add(pref)

    db.commit()

    # Return updated list
    prefs = (
        db.query(UserCriteriaPreference)
        .filter(UserCriteriaPreference.user_id == user.id)
        .join(Criteria)
        .order_by(Criteria.sort_order)
        .all()
    )
    items = []
    for p in prefs:
        items.append(CriteriaPreferenceResponse(
            id=p.id,
            criteria_id=p.criteria_id,
            criteria_code=p.criteria.code,
            criteria_name=p.criteria.name,
            priority_level=p.priority_level,
            priority_score=p.priority_score,
            updated_at=p.updated_at,
        ))
    return CriteriaPreferencesListResponse(preferences=items)


# --- Property Fit Endpoint ---

@router.get("/properties/{property_id}/fit", response_model=PropertyFitResponse)
def get_property_fit(
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

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo hồ sơ để xem mức độ phù hợp.",
        )

    return calculate_property_fit(prop, profile)


# ============================================================
# Phase 6: DSS Combination / Recommendation Endpoints
# ============================================================

from app.services.dss_combination_service import (
    get_or_compute_property_dss,
    refresh_recommendations_for_user,
)

PLACEHOLDER_IMAGE = "https://placehold.co/600x400?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"


def _primary_image(prop: Property) -> str:
    primary = next((img.image_url for img in prop.images if img.is_primary), None)
    if not primary and prop.images:
        primary = prop.images[0].image_url
    return primary or PLACEHOLDER_IMAGE


def _short_explanation(full: Optional[str], max_len: int = 120) -> Optional[str]:
    if not full:
        return None
    if len(full) <= max_len:
        return full
    return full[:max_len].rsplit(" ", 1)[0] + "…"


@router.get("/properties/{property_id}/final-score", response_model=PropertyDSSScoreResponse)
def get_property_final_score(
    property_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """Get the final combined DSS score for a property for the current user."""
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

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo hồ sơ trước khi xem đánh giá tổng hợp.",
        )

    record = get_or_compute_property_dss(db, prop, user)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không thể tính điểm DSS cho bất động sản này.",
        )

    breakdown = None
    if record.breakdown_json:
        try:
            breakdown = DSSScoreBreakdown(**json.loads(record.breakdown_json))
        except Exception:
            breakdown = None

    return PropertyDSSScoreResponse(
        property_id=record.property_id,
        ahp_score=record.ahp_score,
        ai_score=record.ai_score,
        fit_score_basic=record.fit_score_basic,
        final_score=record.final_score,
        recommendation_label=record.recommendation_label,
        explanation_summary=record.explanation_summary,
        breakdown=breakdown,
    )


@router.get("/properties/{property_id}/explain", response_model=PropertyExplainabilityResponse)
def explain_property_score(
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

    explainability = build_property_explainability(db, prop, user)
    if not explainability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa có đủ dữ liệu hồ sơ hoặc DSS để xem giải thích chi tiết.",
        )
    return explainability


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    suburb: Optional[str] = Query(None, max_length=200),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    property_type: Optional[str] = Query(None, max_length=100),
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """Get ranked DSS recommendations for the logged-in user."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo hồ sơ để xem gợi ý.",
        )

    # Base query: join scores with properties
    query = (
        db.query(PropertyDSSScore, Property)
        .join(Property, PropertyDSSScore.property_id == Property.id)
        .filter(PropertyDSSScore.user_id == user.id)
    )

    # Apply filters
    if suburb:
        query = query.filter(Property.suburb.ilike(f"%{suburb}%"))
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)
    if property_type:
        query = query.filter(Property.property_type == property_type)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Order by final_score descending
    rows = (
        query
        .options(joinedload(Property.images))
        .order_by(PropertyDSSScore.final_score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Deduplicate (joinedload can cause duplicates)
    seen: set = set()
    items: List[RecommendedPropertyItem] = []
    rank_base = (page - 1) * page_size
    for score_rec, prop in rows:
        if prop.id in seen:
            continue
        seen.add(prop.id)
        items.append(RecommendedPropertyItem(
            rank=rank_base + len(items) + 1,
            property_id=prop.id,
            title=prop.title,
            address=prop.address,
            suburb=prop.suburb,
            price=prop.price,
            rooms=prop.rooms,
            bathrooms=prop.bathrooms,
            cars=prop.cars,
            property_type=prop.property_type,
            primary_image=_primary_image(prop),
            final_score=score_rec.final_score,
            recommendation_label=score_rec.recommendation_label,
            explanation_summary_short=_short_explanation(score_rec.explanation_summary),
        ))

    return RecommendationsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/recommendations/refresh", response_model=RecommendationRefreshResponse)
def refresh_recommendations(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """Recompute all DSS recommendations for the current user."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa tạo hồ sơ nhu cầu. Vui lòng tạo hồ sơ trước.",
        )

    count = refresh_recommendations_for_user(db, user)
    return RecommendationRefreshResponse(
        message=f"Đã cập nhật gợi ý cho {count} bất động sản.",
        properties_scored=count,
    )


@router.get("/recommendations/summary", response_model=RecommendationsSummaryResponse)
def get_recommendations_summary(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    """Get a lightweight summary of the user's recommendations."""
    total = (
        db.query(sa_func.count(PropertyDSSScore.id))
        .filter(PropertyDSSScore.user_id == user.id)
        .scalar()
    ) or 0

    if total == 0:
        return RecommendationsSummaryResponse(
            total_evaluated=0,
            label_counts=[],
            top_suburbs=[],
            average_final_score=None,
        )

    # Count by label
    label_rows = (
        db.query(PropertyDSSScore.recommendation_label, sa_func.count(PropertyDSSScore.id))
        .filter(PropertyDSSScore.user_id == user.id)
        .group_by(PropertyDSSScore.recommendation_label)
        .all()
    )
    label_counts = [LabelCount(label=row[0], count=row[1]) for row in label_rows]

    # Average final score
    avg_score = (
        db.query(sa_func.avg(PropertyDSSScore.final_score))
        .filter(PropertyDSSScore.user_id == user.id)
        .scalar()
    )

    # Top suburbs from high-scoring properties
    top_suburb_rows = (
        db.query(Property.suburb, sa_func.count(Property.id))
        .join(PropertyDSSScore, PropertyDSSScore.property_id == Property.id)
        .filter(
            PropertyDSSScore.user_id == user.id,
            PropertyDSSScore.final_score >= 55,
            Property.suburb.isnot(None),
        )
        .group_by(Property.suburb)
        .order_by(sa_func.count(Property.id).desc())
        .limit(5)
        .all()
    )
    top_suburbs = [row[0] for row in top_suburb_rows]

    return RecommendationsSummaryResponse(
        total_evaluated=total,
        label_counts=label_counts,
        top_suburbs=top_suburbs,
        average_final_score=round(avg_score, 2) if avg_score else None,
    )
