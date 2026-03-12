from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class PropertyAHPScore(Base):
    __tablename__ = "property_ahp_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_user_property_ahp_score"),
    )

    user = relationship("User", backref="ahp_scores")
    property = relationship("Property", backref="ahp_scores")
