import json

from fastapi import APIRouter, Depends
from sqlalchemy import func as sa_func, or_
from sqlalchemy.orm import Session

from app.core.security import require_admin_user
from app.db.session import get_db
from app.models.comparison_item import ComparisonItem
from app.models.favorite import Favorite
from app.models.model_version import ModelVersion
from app.models.property import Property
from app.models.property_dss_score import PropertyDSSScore
from app.models.property_valuation import PropertyValuation
from app.models.user import User
from app.schemas.phase7 import (
    AdminActiveModelInfo,
    AdminDataStatusResponse,
    AdminModelStatusResponse,
    AdminSystemSummaryResponse,
)

router = APIRouter()


@router.get("/models/status", response_model=AdminModelStatusResponse)
def get_model_status(
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    total_models = db.query(sa_func.count(ModelVersion.id)).scalar() or 0
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        return AdminModelStatusResponse(
            total_models=total_models,
            active_model=None,
            message="Chưa có mô hình AI nào đang hoạt động.",
        )
    metrics = None
    if active_model.metrics_json:
        try:
            metrics = json.loads(active_model.metrics_json)
        except Exception:
            metrics = None
    return AdminModelStatusResponse(
        total_models=total_models,
        active_model=AdminActiveModelInfo(
            id=active_model.id,
            model_name=active_model.model_name,
            version=active_model.version,
            algorithm=active_model.algorithm,
            metrics=metrics,
            created_at=active_model.created_at,
        ),
        message="Thông tin mô hình phản ánh trạng thái hiện tại trong cơ sở dữ liệu.",
    )


@router.get("/data/status", response_model=AdminDataStatusResponse)
def get_data_status(
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    property_count = db.query(sa_func.count(Property.id)).scalar() or 0
    valuation_coverage_count = db.query(sa_func.count(sa_func.distinct(PropertyValuation.property_id))).scalar() or 0
    dss_score_coverage_count = db.query(sa_func.count(sa_func.distinct(PropertyDSSScore.property_id))).scalar() or 0
    missing_coordinate_count = (
        db.query(sa_func.count(Property.id))
        .filter(or_(Property.latitude.is_(None), Property.longitude.is_(None)))
        .scalar()
        or 0
    )
    missing_key_feature_count = (
        db.query(sa_func.count(Property.id))
        .filter(
            or_(
                Property.price.is_(None),
                Property.bedrooms.is_(None),
                Property.bathrooms.is_(None),
                Property.property_type.is_(None),
            )
        )
        .scalar()
        or 0
    )
    return AdminDataStatusResponse(
        property_count=property_count,
        valuation_coverage_count=valuation_coverage_count,
        dss_score_coverage_count=dss_score_coverage_count,
        missing_coordinate_count=missing_coordinate_count,
        missing_key_feature_count=missing_key_feature_count,
    )


@router.get("/system/summary", response_model=AdminSystemSummaryResponse)
def get_system_summary(
    _: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    user_count = db.query(sa_func.count(User.id)).scalar() or 0
    admin_count = db.query(sa_func.count(User.id)).filter(User.role == "admin").scalar() or 0
    favorites_count = db.query(sa_func.count(Favorite.id)).scalar() or 0
    comparison_item_count = db.query(sa_func.count(ComparisonItem.id)).scalar() or 0
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    latest_model_created_at = db.query(sa_func.max(ModelVersion.created_at)).scalar()
    return AdminSystemSummaryResponse(
        user_count=user_count,
        admin_count=admin_count,
        favorites_count=favorites_count,
        comparison_item_count=comparison_item_count,
        latest_model_created_at=latest_model_created_at,
        active_model_name=f"{active_model.model_name} v{active_model.version}" if active_model else None,
        note="Đây là lớp quan sát vận hành cơ bản phục vụ demo và kiểm tra nhanh, không thay thế công cụ monitoring chuyên dụng.",
    )