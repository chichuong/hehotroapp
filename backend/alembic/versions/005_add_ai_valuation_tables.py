"""add AI valuation tables: model_versions, property_valuations, prediction_logs

Revision ID: 005
Revises: 004
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # model_versions
    op.create_table(
        "model_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(100), nullable=False),
        sa.Column("algorithm", sa.String(100), nullable=False),
        sa.Column("target_column", sa.String(100), nullable=False),
        sa.Column("feature_list_json", sa.Text(), nullable=True),
        sa.Column("metrics_json", sa.Text(), nullable=True),
        sa.Column("artifact_path", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # property_valuations
    op.create_table(
        "property_valuations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_version_id", sa.Integer(), sa.ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("predicted_price", sa.Float(), nullable=False),
        sa.Column("valuation_label", sa.String(100), nullable=True),
        sa.Column("valuation_gap", sa.Float(), nullable=True),
        sa.Column("valuation_gap_percent", sa.Float(), nullable=True),
        sa.Column("confidence_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_property_valuations_property_id", "property_valuations", ["property_id"])
    op.create_index("ix_property_valuations_model_version_id", "property_valuations", ["model_version_id"])

    # prediction_logs
    op.create_table(
        "prediction_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("properties.id", ondelete="SET NULL"), nullable=True),
        sa.Column("model_version_id", sa.Integer(), sa.ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("input_json", sa.Text(), nullable=True),
        sa.Column("output_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_prediction_logs_user_id", "prediction_logs", ["user_id"])
    op.create_index("ix_prediction_logs_property_id", "prediction_logs", ["property_id"])


def downgrade() -> None:
    op.drop_table("prediction_logs")
    op.drop_table("property_valuations")
    op.drop_table("model_versions")
