from sqlalchemy import Column, Integer, Float, String, DateTime, Text, ForeignKey, func

from app.db.base import Base


class PropertyValuation(Base):
    __tablename__ = "property_valuations"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_price = Column(Float, nullable=False)
    valuation_label = Column(String(100), nullable=True)
    valuation_gap = Column(Float, nullable=True)
    valuation_gap_percent = Column(Float, nullable=True)
    confidence_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
