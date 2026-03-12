"""add AHP tables: ahp_matrices, ahp_matrix_entries, property_ahp_scores

Revision ID: 004
Revises: 003
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ahp_matrices
    op.create_table(
        "ahp_matrices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ahp_matrices_user_id", "ahp_matrices", ["user_id"])

    # ahp_matrix_entries
    op.create_table(
        "ahp_matrix_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("matrix_id", sa.Integer(), sa.ForeignKey("ahp_matrices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criteria_id_row", sa.Integer(), sa.ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criteria_id_col", sa.Integer(), sa.ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("matrix_id", "criteria_id_row", "criteria_id_col", name="uq_matrix_entry"),
    )
    op.create_index("ix_ahp_matrix_entries_matrix_id", "ahp_matrix_entries", ["matrix_id"])

    # property_ahp_scores (cache table)
    op.create_table(
        "property_ahp_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "property_id", name="uq_user_property_ahp_score"),
    )
    op.create_index("ix_property_ahp_scores_user_id", "property_ahp_scores", ["user_id"])
    op.create_index("ix_property_ahp_scores_property_id", "property_ahp_scores", ["property_id"])


def downgrade() -> None:
    op.drop_table("property_ahp_scores")
    op.drop_table("ahp_matrix_entries")
    op.drop_table("ahp_matrices")
