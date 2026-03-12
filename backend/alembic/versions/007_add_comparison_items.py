"""add comparison_items table for Phase 7 comparison feature

Revision ID: 007
Revises: 006
Create Date: 2026-03-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comparison_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "property_id", name="uq_user_property_comparison"),
    )
    op.create_index("ix_comparison_items_user_id", "comparison_items", ["user_id"])
    op.create_index("ix_comparison_items_property_id", "comparison_items", ["property_id"])


def downgrade() -> None:
    op.drop_table("comparison_items")