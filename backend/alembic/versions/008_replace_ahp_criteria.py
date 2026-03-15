"""replace criteria with 5 fixed AHP criteria

Revision ID: 008
Revises: 007
Create Date: 2026-03-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The 5 fixed AHP criteria codes
AHP_CRITERIA_CODES = {"price", "distance", "rooms", "bedrooms", "year_built"}

# Old criteria codes that should be deactivated
OLD_CODES_TO_DEACTIVATE = {
    "location", "area", "bathrooms", "parking", "property_type",
    "suitability_for_family", "investment_potential", "safety", "legal_status",
}


def upgrade() -> None:
    bind = op.get_bind()

    # Deactivate any criteria not in our 5-code set
    bind.execute(
        sa.text(
            "UPDATE criteria SET is_active = false WHERE code NOT IN "
            "('price','distance','rooms','bedrooms','year_built')"
        )
    )

    # Upsert the 5 required criteria (insert if not present, update if name/description changed)
    five_criteria = [
        {
            "code": "price",
            "name": "Giá",
            "description": "Giá bất động sản — thấp hơn là tốt hơn",
            "is_active": True,
            "sort_order": 1,
        },
        {
            "code": "distance",
            "name": "Khoảng cách",
            "description": "Khoảng cách tới trung tâm hoặc nơi làm việc — gần hơn là tốt hơn",
            "is_active": True,
            "sort_order": 2,
        },
        {
            "code": "rooms",
            "name": "Số phòng",
            "description": "Tổng số phòng — nhiều hơn là tốt hơn",
            "is_active": True,
            "sort_order": 3,
        },
        {
            "code": "bedrooms",
            "name": "Số phòng ngủ",
            "description": "Số lượng phòng ngủ — nhiều hơn là tốt hơn",
            "is_active": True,
            "sort_order": 4,
        },
        {
            "code": "year_built",
            "name": "Năm xây dựng",
            "description": "Năm xây dựng công trình — mới hơn là tốt hơn",
            "is_active": True,
            "sort_order": 5,
        },
    ]

    # Check which codes already exist
    result = bind.execute(sa.text("SELECT code FROM criteria"))
    existing_codes = {row[0] for row in result.fetchall()}

    for c in five_criteria:
        if c["code"] in existing_codes:
            bind.execute(
                sa.text(
                    "UPDATE criteria SET name=:name, description=:description, "
                    "is_active=:is_active, sort_order=:sort_order WHERE code=:code"
                ),
                c,
            )
        else:
            bind.execute(
                sa.text(
                    "INSERT INTO criteria (code, name, description, is_active, sort_order) "
                    "VALUES (:code, :name, :description, :is_active, :sort_order)"
                ),
                c,
            )


def downgrade() -> None:
    # Re-activate all criteria
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE criteria SET is_active = true"))
