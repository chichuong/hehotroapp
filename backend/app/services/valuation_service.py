"""Valuation service: classify property prices and manage valuation records."""

import json
from typing import Optional, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.property import Property
from app.models.property_valuation import PropertyValuation
from app.models.prediction_log import PredictionLog
from app.models.model_version import ModelVersion
from app.ml.predict import load_active_pipeline, predict_single
from app.ml.feature_builder import build_features_from_property

# Configurable thresholds for valuation classification
UNDERPRICED_THRESHOLD = -0.10   # listed price is >10% below predicted
OVERPRICED_THRESHOLD = 0.10     # listed price is >10% above predicted

CONFIDENCE_NOTE = "Kết quả là ước tính từ mô hình AI dựa trên dữ liệu lịch sử."


def classify_valuation(listed_price: Optional[float], predicted_price: float) -> Dict[str, Any]:
    """Classify whether a property is underpriced, fairly priced, or overpriced.

    Returns dict with valuation_label, valuation_gap, valuation_gap_percent.
    """
    if listed_price is None or listed_price <= 0:
        return {
            "valuation_label": None,
            "valuation_gap": None,
            "valuation_gap_percent": None,
        }

    gap = predicted_price - listed_price
    gap_percent = gap / listed_price

    if gap_percent > OVERPRICED_THRESHOLD:
        # Predicted value > listed price → property is underpriced (good deal)
        label = "Định giá thấp"
    elif gap_percent < -UNDERPRICED_THRESHOLD:
        # Predicted value < listed price → property is overpriced
        label = "Định giá cao"
    else:
        label = "Định giá hợp lý"

    return {
        "valuation_label": label,
        "valuation_gap": round(gap, 2),
        "valuation_gap_percent": round(gap_percent * 100, 2),
    }


def predict_property_value(
    db: Session,
    prop: Property,
    user_id: Optional[int] = None,
    force: bool = False,
) -> PropertyValuation:
    """Predict value for a property, store result, and return the valuation record."""
    pipeline, model_version = load_active_pipeline(db)

    # Check for existing valuation with current active model
    if not force:
        existing = (
            db.query(PropertyValuation)
            .filter(
                PropertyValuation.property_id == prop.id,
                PropertyValuation.model_version_id == model_version.id,
            )
            .first()
        )
        if existing:
            return existing

    # Build features and predict
    features = build_features_from_property(prop)
    predicted_price = predict_single(pipeline, features)

    # Classify
    classification = classify_valuation(prop.price, predicted_price)

    # Log prediction
    log = PredictionLog(
        user_id=user_id,
        property_id=prop.id,
        model_version_id=model_version.id,
        input_json=json.dumps(features, default=str),
        output_json=json.dumps({
            "predicted_price": predicted_price,
            **classification,
        }),
    )
    db.add(log)

    # Upsert valuation record
    existing = (
        db.query(PropertyValuation)
        .filter(
            PropertyValuation.property_id == prop.id,
            PropertyValuation.model_version_id == model_version.id,
        )
        .first()
    )

    if existing:
        existing.predicted_price = predicted_price
        existing.valuation_label = classification["valuation_label"]
        existing.valuation_gap = classification["valuation_gap"]
        existing.valuation_gap_percent = classification["valuation_gap_percent"]
        existing.confidence_note = CONFIDENCE_NOTE
        existing.updated_at = datetime.utcnow()
        valuation = existing
    else:
        valuation = PropertyValuation(
            property_id=prop.id,
            model_version_id=model_version.id,
            predicted_price=predicted_price,
            valuation_label=classification["valuation_label"],
            valuation_gap=classification["valuation_gap"],
            valuation_gap_percent=classification["valuation_gap_percent"],
            confidence_note=CONFIDENCE_NOTE,
        )
        db.add(valuation)

    db.commit()
    db.refresh(valuation)
    return valuation


def get_existing_valuation(db: Session, property_id: int) -> Optional[PropertyValuation]:
    """Get existing valuation for a property with the active model, or None."""
    active_model = (
        db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    )
    if not active_model:
        return None
    return (
        db.query(PropertyValuation)
        .filter(
            PropertyValuation.property_id == property_id,
            PropertyValuation.model_version_id == active_model.id,
        )
        .first()
    )
