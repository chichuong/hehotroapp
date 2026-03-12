from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class PropertyDSSScore(Base):
    __tablename__ = "property_dss_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    ahp_score = Column(Float, nullable=True)
    ai_score = Column(Float, nullable=True)
    fit_score_basic = Column(Float, nullable=True)
    final_score = Column(Float, nullable=False, index=True)
    recommendation_label = Column(String(100), nullable=False)
    explanation_summary = Column(Text, nullable=True)
    breakdown_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_user_property_dss_score"),
    )

    user = relationship("User", backref="dss_scores")
    property = relationship("Property", backref="dss_scores")
