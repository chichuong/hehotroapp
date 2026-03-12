"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "properties",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("suburb", sa.String(255), nullable=True),
        sa.Column("region_name", sa.String(255), nullable=True),
        sa.Column("postcode", sa.String(20), nullable=True),
        sa.Column("property_type", sa.String(50), nullable=True),
        sa.Column("rooms", sa.Integer(), nullable=True),
        sa.Column("bedrooms", sa.Integer(), nullable=True),
        sa.Column("bathrooms", sa.Integer(), nullable=True),
        sa.Column("cars", sa.Integer(), nullable=True),
        sa.Column("land_size", sa.Float(), nullable=True),
        sa.Column("building_area", sa.Float(), nullable=True),
        sa.Column("year_built", sa.Integer(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_properties_suburb", "properties", ["suburb"])
    op.create_index("ix_properties_price", "properties", ["price"])

    op.create_table(
        "property_images",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.String(1000), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false")),
    )
    op.create_index("ix_property_images_property_id", "property_images", ["property_id"])


def downgrade() -> None:
    op.drop_table("property_images")
    op.drop_table("properties")
    op.drop_table("users")
