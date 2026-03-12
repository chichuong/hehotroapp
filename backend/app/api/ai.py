"""AI valuation API endpoints."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.property import Property
from app.models.model_version import ModelVersion
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.ai import (
    ModelVersionResponse,
    ModelListResponse,
    TrainRequest,
    TrainResponse,
    ValuationResponse,
    AIHealthResponse,
    CustomPredictRequest,
    CustomPredictResponse,
)
from app.ml.model_registry import get_active_model, list_models, activate_model as do_activate
from app.ml.predict import invalidate_cache
from app.services.valuation_service import (
    predict_property_value,
    get_existing_valuation,
    CONFIDENCE_NOTE,
)

router = APIRouter()


def _model_to_response(m: ModelVersion) -> ModelVersionResponse:
    return ModelVersionResponse(
        id=m.id,
        model_name=m.model_name,
        version=m.version,
        algorithm=m.algorithm,
        target_column=m.target_column,
        feature_list=json.loads(m.feature_list_json) if m.feature_list_json else None,
        metrics=json.loads(m.metrics_json) if m.metrics_json else None,
        artifact_path=m.artifact_path,
        is_active=m.is_active,
        created_at=m.created_at,
    )


@router.get("/health", response_model=AIHealthResponse)
def ai_health(db: Session = Depends(get_db)):
    """Check whether an active AI model is available."""
    active = get_active_model(db)
    if active:
        return AIHealthResponse(
            status="ok",
            active_model=active.model_name,
            model_version=active.version,
            model_id=active.id,
            message="Mô hình AI đang hoạt động.",
        )
    return AIHealthResponse(
        status="no_model",
        message="Chưa có mô hình AI nào được kích hoạt.",
    )


@router.get("/models", response_model=ModelListResponse)
def list_model_versions(db: Session = Depends(get_db)):
    """List all trained model versions."""
    models = list_models(db)
    return ModelListResponse(
        models=[_model_to_response(m) for m in models]
    )


@router.post("/models/{model_id}/activate", response_model=ModelVersionResponse)
def activate_model_endpoint(
    model_id: int,
    db: Session = Depends(get_db),
):
    """Activate a specific model version for inference."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mô hình.",
        )
    do_activate(db, model_id)
    db.commit()
    db.refresh(model)
    invalidate_cache()
    return _model_to_response(model)


@router.post("/train", response_model=TrainResponse)
def train_model(
    request: TrainRequest = TrainRequest(),
    db: Session = Depends(get_db),
):
    """Trigger a synchronous model training run."""
    from app.ml.train_model import train as run_training

    try:
        metrics = run_training(
            n_estimators=request.n_estimators,
            test_size=request.test_size,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi huấn luyện mô hình: {str(e)}",
        )

    # Get the newly registered model
    active = get_active_model(db)
    invalidate_cache()

    return TrainResponse(
        model_id=active.id if active else 0,
        version=active.version if active else "",
        metrics=metrics,
        message="Huấn luyện mô hình thành công.",
    )


@router.get("/properties/{property_id}/valuation", response_model=ValuationResponse)
def get_valuation(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get existing valuation for a property, or compute one if model is available."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản.",
        )

    # Try existing valuation first
    valuation = get_existing_valuation(db, property_id)

    # If no valuation exists but we have an active model, compute lazily
    if valuation is None:
        active = get_active_model(db)
        if active is None:
            return ValuationResponse(
                property_id=property_id,
                predicted_price=0,
                listed_price=prop.price,
                confidence_note="Chưa có mô hình AI nào được kích hoạt.",
            )
        try:
            valuation = predict_property_value(
                db, prop, user_id=current_user.id if current_user else None
            )
        except Exception:
            return ValuationResponse(
                property_id=property_id,
                predicted_price=0,
                listed_price=prop.price,
                confidence_note="Không thể tính toán định giá lúc này.",
            )

    active = get_active_model(db)
    return ValuationResponse(
        property_id=property_id,
        predicted_price=valuation.predicted_price,
        listed_price=prop.price,
        valuation_label=valuation.valuation_label,
        valuation_gap=valuation.valuation_gap,
        valuation_gap_percent=valuation.valuation_gap_percent,
        confidence_note=valuation.confidence_note,
        model_version_id=valuation.model_version_id,
        model_name=active.model_name if active else None,
    )


@router.post("/properties/{property_id}/valuation", response_model=ValuationResponse)
def compute_valuation(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Force recomputation of valuation for a property."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bất động sản.",
        )

    active = get_active_model(db)
    if active is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa có mô hình AI nào được kích hoạt.",
        )

    try:
        valuation = predict_property_value(
            db, prop, user_id=current_user.id if current_user else None, force=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tính toán định giá: {str(e)}",
        )

    return ValuationResponse(
        property_id=property_id,
        predicted_price=valuation.predicted_price,
        listed_price=prop.price,
        valuation_label=valuation.valuation_label,
        valuation_gap=valuation.valuation_gap,
        valuation_gap_percent=valuation.valuation_gap_percent,
        confidence_note=valuation.confidence_note,
        model_version_id=valuation.model_version_id,
        model_name=active.model_name,
    )


@router.post("/predict", response_model=CustomPredictResponse)
def predict_custom(
    request: CustomPredictRequest,
    db: Session = Depends(get_db),
):
    """Predict price from arbitrary feature input (for testing)."""
    from app.ml.predict import load_active_pipeline, predict_single
    from app.ml.feature_builder import build_features_from_dict

    try:
        pipeline, model_version = load_active_pipeline(db)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    features = build_features_from_dict(request.features)
    predicted_price = predict_single(pipeline, features)

    return CustomPredictResponse(
        predicted_price=predicted_price,
        confidence_note=CONFIDENCE_NOTE,
        features_used=features,
    )
