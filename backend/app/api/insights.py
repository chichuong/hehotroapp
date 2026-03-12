import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.property import Property
from app.schemas.phase7 import (
    MarketOverviewResponse,
    PriceDistributionBucket,
    PriceDistributionResponse,
    PropertyTypeDistributionItem,
    SuburbInsightItem,
)

router = APIRouter()


@router.get("/market-overview", response_model=MarketOverviewResponse)
def get_market_overview(db: Session = Depends(get_db)):
    total_properties = db.query(sa_func.count(Property.id)).scalar() or 0
    avg_price, min_price, max_price = (
        db.query(sa_func.avg(Property.price), sa_func.min(Property.price), sa_func.max(Property.price))
        .filter(Property.price.isnot(None))
        .one()
    )

    type_rows = (
        db.query(Property.property_type, sa_func.count(Property.id))
        .filter(Property.property_type.isnot(None))
        .group_by(Property.property_type)
        .order_by(sa_func.count(Property.id).desc())
        .all()
    )
    property_type_distribution = [
        PropertyTypeDistributionItem(property_type=row[0], count=row[1])
        for row in type_rows
        if row[0]
    ]

    suburb_rows = (
        db.query(
            Property.suburb,
            sa_func.count(Property.id),
            sa_func.avg(Property.price),
            sa_func.min(Property.price),
            sa_func.max(Property.price),
            sa_func.avg(Property.rooms),
            sa_func.avg(Property.bathrooms),
            sa_func.avg(Property.cars),
        )
        .filter(Property.suburb.isnot(None))
        .group_by(Property.suburb)
        .order_by(sa_func.count(Property.id).desc(), Property.suburb.asc())
        .limit(8)
        .all()
    )
    top_suburbs = [
        SuburbInsightItem(
            suburb=row[0],
            property_count=row[1],
            average_price=round(row[2], 2) if row[2] is not None else None,
            min_price=row[3],
            max_price=row[4],
            average_rooms=round(row[5], 2) if row[5] is not None else None,
            average_bathrooms=round(row[6], 2) if row[6] is not None else None,
            average_cars=round(row[7], 2) if row[7] is not None else None,
        )
        for row in suburb_rows
    ]

    return MarketOverviewResponse(
        total_properties=total_properties,
        average_price=round(avg_price, 2) if avg_price is not None else None,
        min_price=min_price,
        max_price=max_price,
        property_type_distribution=property_type_distribution,
        top_suburbs_by_count=top_suburbs,
        note="Các chỉ số này được tổng hợp trực tiếp từ bộ dữ liệu bất động sản đang có trong hệ thống, không phải dữ liệu thị trường thời gian thực.",
    )


@router.get("/suburbs", response_model=list[SuburbInsightItem])
def get_suburb_insights(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            Property.suburb,
            sa_func.count(Property.id),
            sa_func.avg(Property.price),
            sa_func.min(Property.price),
            sa_func.max(Property.price),
            sa_func.avg(Property.rooms),
            sa_func.avg(Property.bathrooms),
            sa_func.avg(Property.cars),
        )
        .filter(Property.suburb.isnot(None))
        .group_by(Property.suburb)
        .order_by(sa_func.avg(Property.price).desc().nullslast())
        .limit(limit)
        .all()
    )
    return [
        SuburbInsightItem(
            suburb=row[0],
            property_count=row[1],
            average_price=round(row[2], 2) if row[2] is not None else None,
            min_price=row[3],
            max_price=row[4],
            average_rooms=round(row[5], 2) if row[5] is not None else None,
            average_bathrooms=round(row[6], 2) if row[6] is not None else None,
            average_cars=round(row[7], 2) if row[7] is not None else None,
        )
        for row in rows
    ]


@router.get("/price-distribution", response_model=PriceDistributionResponse)
def get_price_distribution(db: Session = Depends(get_db)):
    price_rows = [row[0] for row in db.query(Property.price).filter(Property.price.isnot(None)).all()]
    if not price_rows:
        return PriceDistributionResponse(total_properties=0, buckets=[], note="Chưa có dữ liệu giá để phân tích.")

    min_price = min(price_rows)
    max_price = max(price_rows)
    bucket_count = min(8, max(4, int(math.sqrt(len(price_rows)))))
    bucket_size = max(1.0, math.ceil((max_price - min_price) / bucket_count))
    buckets = []
    for index in range(bucket_count):
        bucket_min = min_price + (index * bucket_size)
        bucket_max = max_price if index == bucket_count - 1 else bucket_min + bucket_size
        if index == bucket_count - 1:
            count = sum(1 for price in price_rows if bucket_min <= price <= bucket_max)
        else:
            count = sum(1 for price in price_rows if bucket_min <= price < bucket_max)
        buckets.append(
            PriceDistributionBucket(
                label=f"${bucket_min:,.0f} - ${bucket_max:,.0f}",
                min_price=float(bucket_min),
                max_price=float(bucket_max),
                count=count,
            )
        )

    return PriceDistributionResponse(
        total_properties=len(price_rows),
        buckets=buckets,
        note="Các khoảng giá được chia tự động để hỗ trợ trực quan hóa nhanh trên giao diện demo.",
    )