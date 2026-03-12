from fastapi import APIRouter, Depends
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.core.security import require_current_user
from app.db.session import get_db
from app.models.comparison_item import ComparisonItem
from app.models.favorite import Favorite
from app.models.property import Property
from app.models.property_dss_score import PropertyDSSScore
from app.models.user import User
from app.schemas.dss import LabelCount
from app.schemas.phase7 import UserDashboardInsightsResponse, UserDashboardSummaryResponse

router = APIRouter()


@router.get("/user-summary", response_model=UserDashboardSummaryResponse)
def get_user_summary(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    favorites_count = db.query(sa_func.count(Favorite.id)).filter(Favorite.user_id == user.id).scalar() or 0
    compared_count = db.query(sa_func.count(ComparisonItem.id)).filter(ComparisonItem.user_id == user.id).scalar() or 0
    total_evaluated = db.query(sa_func.count(PropertyDSSScore.id)).filter(PropertyDSSScore.user_id == user.id).scalar() or 0

    average_saved_score = (
        db.query(sa_func.avg(PropertyDSSScore.final_score))
        .join(Favorite, Favorite.property_id == PropertyDSSScore.property_id)
        .filter(Favorite.user_id == user.id, PropertyDSSScore.user_id == user.id)
        .scalar()
    )

    suburb_rows = (
        db.query(Property.suburb, sa_func.count(Property.id))
        .join(PropertyDSSScore, PropertyDSSScore.property_id == Property.id)
        .filter(
            PropertyDSSScore.user_id == user.id,
            PropertyDSSScore.final_score >= 55,
            Property.suburb.isnot(None),
        )
        .group_by(Property.suburb)
        .order_by(sa_func.count(Property.id).desc(), Property.suburb.asc())
        .limit(3)
        .all()
    )
    highlighted_suburbs = [row[0] for row in suburb_rows]

    quick_summary = (
        f"Bạn đang lưu {favorites_count} bất động sản yêu thích, so sánh {compared_count} bất động sản và đã có {total_evaluated} kết quả DSS."
    )
    if highlighted_suburbs:
        quick_summary += f" Khu vực nổi bật hiện tại: {', '.join(highlighted_suburbs)}."
    elif total_evaluated == 0:
        quick_summary += " Hãy mở trang gợi ý DSS hoặc xem chi tiết bất động sản để tạo thêm dữ liệu đánh giá."

    return UserDashboardSummaryResponse(
        favorites_count=favorites_count,
        compared_count=compared_count,
        total_evaluated_recommendations=total_evaluated,
        average_saved_dss_score=round(average_saved_score, 2) if average_saved_score is not None else None,
        highlighted_suburbs=highlighted_suburbs,
        quick_summary=quick_summary,
    )


@router.get("/user-insights", response_model=UserDashboardInsightsResponse)
def get_user_insights(
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    distribution_rows = (
        db.query(PropertyDSSScore.recommendation_label, sa_func.count(PropertyDSSScore.id))
        .filter(PropertyDSSScore.user_id == user.id)
        .group_by(PropertyDSSScore.recommendation_label)
        .order_by(sa_func.count(PropertyDSSScore.id).desc())
        .all()
    )
    distribution = [LabelCount(label=row[0], count=row[1]) for row in distribution_rows]

    top_suburb_rows = (
        db.query(Property.suburb, sa_func.avg(PropertyDSSScore.final_score))
        .join(PropertyDSSScore, PropertyDSSScore.property_id == Property.id)
        .filter(
            PropertyDSSScore.user_id == user.id,
            Property.suburb.isnot(None),
        )
        .group_by(Property.suburb)
        .order_by(sa_func.avg(PropertyDSSScore.final_score).desc(), Property.suburb.asc())
        .limit(5)
        .all()
    )
    saved_average = (
        db.query(sa_func.avg(PropertyDSSScore.final_score))
        .join(Favorite, Favorite.property_id == PropertyDSSScore.property_id)
        .filter(Favorite.user_id == user.id, PropertyDSSScore.user_id == user.id)
        .scalar()
    )
    compared_average = (
        db.query(sa_func.avg(PropertyDSSScore.final_score))
        .join(ComparisonItem, ComparisonItem.property_id == PropertyDSSScore.property_id)
        .filter(ComparisonItem.user_id == user.id, PropertyDSSScore.user_id == user.id)
        .scalar()
    )
    note = "Các chỉ số này dựa trên kết quả DSS đã được tạo trong hệ thống."
    if not distribution:
        note = "Bạn chưa có đủ dữ liệu DSS để tạo insight cá nhân sâu hơn."

    return UserDashboardInsightsResponse(
        recommendation_distribution=distribution,
        top_recommended_suburbs=[row[0] for row in top_suburb_rows],
        saved_properties_average_score=round(saved_average, 2) if saved_average is not None else None,
        compared_properties_average_score=round(compared_average, 2) if compared_average is not None else None,
        summary_note=note,
    )