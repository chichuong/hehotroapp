"""Model registry: save/load model artifacts and manage model versions in DB."""

import json
import os
from datetime import datetime
from typing import Optional

import joblib
from sqlalchemy.orm import Session

from app.models.model_version import ModelVersion

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "models")


def ensure_artifacts_dir() -> str:
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    return ARTIFACTS_DIR


def save_artifact(pipeline, version_tag: str) -> str:
    """Save a trained sklearn pipeline to disk, return the file path."""
    artifacts_dir = ensure_artifacts_dir()
    filename = f"rf_model_{version_tag}.joblib"
    filepath = os.path.join(artifacts_dir, filename)
    joblib.dump(pipeline, filepath)
    return filepath


def load_artifact(filepath: str):
    """Load a trained sklearn pipeline from disk."""
    return joblib.load(filepath)


def register_model(
    db: Session,
    model_name: str,
    version: str,
    algorithm: str,
    target_column: str,
    feature_list: list,
    metrics: dict,
    artifact_path: str,
    activate: bool = True,
) -> ModelVersion:
    """Register a new model version in the database."""
    model_version = ModelVersion(
        model_name=model_name,
        version=version,
        algorithm=algorithm,
        target_column=target_column,
        feature_list_json=json.dumps(feature_list),
        metrics_json=json.dumps(metrics),
        artifact_path=artifact_path,
        is_active=False,
    )
    db.add(model_version)
    db.flush()

    if activate:
        activate_model(db, model_version.id)

    db.commit()
    db.refresh(model_version)
    return model_version


def activate_model(db: Session, model_id: int) -> Optional[ModelVersion]:
    """Set one model as active, deactivating all others."""
    db.query(ModelVersion).update({"is_active": False})
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if model:
        model.is_active = True
        db.flush()
    return model


def get_active_model(db: Session) -> Optional[ModelVersion]:
    """Get the currently active model version."""
    return db.query(ModelVersion).filter(ModelVersion.is_active == True).first()


def list_models(db: Session) -> list:
    """List all model versions ordered by creation date descending."""
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()
