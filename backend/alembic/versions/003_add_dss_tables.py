"""add DSS tables: user_profiles, criteria, user_criteria_preferences, recommendation_profiles

Revision ID: 003
Revises: 002
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user_profiles
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("buying_purpose", sa.String(100), nullable=True),
        sa.Column("budget_min", sa.Float(), nullable=True),
        sa.Column("budget_max", sa.Float(), nullable=True),
        sa.Column("preferred_suburbs", sa.JSON(), nullable=True),
        sa.Column("preferred_region_names", sa.JSON(), nullable=True),
        sa.Column("preferred_property_types", sa.JSON(), nullable=True),
        sa.Column("min_bedrooms", sa.Integer(), nullable=True),
        sa.Column("min_bathrooms", sa.Integer(), nullable=True),
        sa.Column("min_cars", sa.Integer(), nullable=True),
        sa.Column("preferred_min_year_built", sa.Integer(), nullable=True),
        sa.Column("risk_tolerance", sa.String(50), nullable=True),
        sa.Column("family_size", sa.Integer(), nullable=True),
        sa.Column("has_children", sa.Boolean(), nullable=True),
        sa.Column("work_location_text", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    # criteria
    op.create_table(
        "criteria",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_criteria_code", "criteria", ["code"])

    # user_criteria_preferences
    op.create_table(
        "user_criteria_preferences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criteria_id", sa.Integer(), sa.ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("priority_level", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("priority_score", sa.Float(), nullable=False, server_default=sa.text("50.0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "criteria_id", name="uq_user_criteria"),
    )
    op.create_index("ix_user_criteria_preferences_user_id", "user_criteria_preferences", ["user_id"])
    op.create_index("ix_user_criteria_preferences_criteria_id", "user_criteria_preferences", ["criteria_id"])

    # recommendation_profiles
    op.create_table(
        "recommendation_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_label", sa.String(255), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_recommendation_profiles_user_id", "recommendation_profiles", ["user_id"])

    # Seed default criteria
    criteria_table = sa.table(
        "criteria",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("is_active", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        criteria_table,
        [
            {"code": "price", "name": "Giá", "description": "Giá bất động sản phù hợp với ngân sách", "is_active": True, "sort_order": 1},
            {"code": "location", "name": "Vị trí", "description": "Khu vực và vị trí địa lý", "is_active": True, "sort_order": 2},
            {"code": "area", "name": "Diện tích", "description": "Diện tích đất và diện tích xây dựng", "is_active": True, "sort_order": 3},
            {"code": "bedrooms", "name": "Số phòng ngủ", "description": "Số lượng phòng ngủ", "is_active": True, "sort_order": 4},
            {"code": "bathrooms", "name": "Số phòng tắm", "description": "Số lượng phòng tắm", "is_active": True, "sort_order": 5},
            {"code": "parking", "name": "Chỗ đậu xe", "description": "Số lượng chỗ đậu xe", "is_active": True, "sort_order": 6},
            {"code": "property_type", "name": "Loại bất động sản", "description": "Loại hình bất động sản (nhà phố, căn hộ, v.v.)", "is_active": True, "sort_order": 7},
            {"code": "year_built", "name": "Năm xây dựng", "description": "Năm xây dựng công trình", "is_active": True, "sort_order": 8},
            {"code": "suitability_for_family", "name": "Phù hợp gia đình", "description": "Mức độ phù hợp cho gia đình có trẻ nhỏ", "is_active": True, "sort_order": 9},
            {"code": "investment_potential", "name": "Tiềm năng đầu tư", "description": "Tiềm năng sinh lời và tăng giá. Tiêu chí này sẽ được mở rộng khi hệ thống có thêm dữ liệu.", "is_active": True, "sort_order": 10},
            {"code": "safety", "name": "Mức độ an toàn", "description": "Mức độ an toàn khu vực. Tiêu chí này sẽ được mở rộng khi hệ thống có thêm dữ liệu.", "is_active": True, "sort_order": 11},
            {"code": "legal_status", "name": "Pháp lý", "description": "Tình trạng pháp lý bất động sản. Tiêu chí này sẽ được mở rộng khi hệ thống có thêm dữ liệu.", "is_active": True, "sort_order": 12},
        ],
    )


def downgrade() -> None:
    op.drop_table("recommendation_profiles")
    op.drop_table("user_criteria_preferences")
    op.drop_table("criteria")
    op.drop_table("user_profiles")
