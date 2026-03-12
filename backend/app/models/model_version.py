from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, func

from app.db.base import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False)
    version = Column(String(100), nullable=False)
    algorithm = Column(String(100), nullable=False)
    target_column = Column(String(100), nullable=False)
    feature_list_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    artifact_path = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
