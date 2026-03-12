"""add property_dss_scores table for Phase 6 DSS combination engine

Revision ID: 006
Revises: 005
Create Date: 2026-03-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "property_dss_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ahp_score", sa.Float(), nullable=True),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("fit_score_basic", sa.Float(), nullable=True),
        sa.Column("final_score", sa.Float(), nullable=False),
        sa.Column("recommendation_label", sa.String(100), nullable=False),
        sa.Column("explanation_summary", sa.Text(), nullable=True),
        sa.Column("breakdown_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "property_id", name="uq_user_property_dss_score"),
    )
    op.create_index("ix_property_dss_scores_user_id", "property_dss_scores", ["user_id"])
    op.create_index("ix_property_dss_scores_property_id", "property_dss_scores", ["property_id"])
    op.create_index("ix_property_dss_scores_final_score", "property_dss_scores", ["final_score"])


def downgrade() -> None:
    op.drop_table("property_dss_scores")
