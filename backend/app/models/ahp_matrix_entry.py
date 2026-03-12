from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class AHPMatrixEntry(Base):
    __tablename__ = "ahp_matrix_entries"

    id = Column(Integer, primary_key=True, index=True)
    matrix_id = Column(Integer, ForeignKey("ahp_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    criteria_id_row = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    criteria_id_col = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("matrix_id", "criteria_id_row", "criteria_id_col", name="uq_matrix_entry"),
    )

    matrix = relationship("AHPMatrix", back_populates="entries")
    criteria_row = relationship("Criteria", foreign_keys=[criteria_id_row])
    criteria_col = relationship("Criteria", foreign_keys=[criteria_id_col])
