from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey, func

from app.db.base import Base


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
