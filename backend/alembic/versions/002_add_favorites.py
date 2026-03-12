"""add favorites table

Revision ID: 002
Revises: 001
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "property_id", name="uq_user_property_favorite"),
    )
    op.create_index("ix_favorites_user_id", "favorites", ["user_id"])
    op.create_index("ix_favorites_property_id", "favorites", ["property_id"])

    # Add indexes for search/filter performance
    op.create_index("ix_properties_rooms", "properties", ["rooms"])
    op.create_index("ix_properties_property_type", "properties", ["property_type"])
    op.create_index("ix_properties_year_built", "properties", ["year_built"])
    op.create_index("ix_properties_bedrooms", "properties", ["bedrooms"])


def downgrade() -> None:
    op.drop_index("ix_properties_bedrooms", table_name="properties")
    op.drop_index("ix_properties_year_built", table_name="properties")
    op.drop_index("ix_properties_property_type", table_name="properties")
    op.drop_index("ix_properties_rooms", table_name="properties")
    op.drop_table("favorites")
