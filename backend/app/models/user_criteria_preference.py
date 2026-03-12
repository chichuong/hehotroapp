from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserCriteriaPreference(Base):
    __tablename__ = "user_criteria_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    criteria_id = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False, index=True)
    priority_level = Column(String(50), nullable=False, default="medium")  # low, medium, high, critical
    priority_score = Column(Float, nullable=False, default=50.0)  # 0-100, future-ready for AHP weights
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "criteria_id", name="uq_user_criteria"),
    )

    user = relationship("User", backref="criteria_preferences")
    criteria = relationship("Criteria", backref="user_preferences")
