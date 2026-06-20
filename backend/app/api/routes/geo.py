from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Customer, CustomerRiskSummary
from app.db.session import get_db
from app.schemas.geo import HeatmapResponse

router = APIRouter()


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(db: Session = Depends(get_db)) -> HeatmapResponse:
    district_summary_rows = (
        db.query(
            Customer.district.label("district"),
            func.avg(CustomerRiskSummary.risk_score).label("avg_risk"),
            func.avg(Customer.latitude).label("latitude"),
            func.avg(Customer.longitude).label("longitude"),
            func.count(CustomerRiskSummary.id).label("records"),
        )
        .join(CustomerRiskSummary, CustomerRiskSummary.customer_id == Customer.customer_id)
        .group_by(Customer.district)
        .all()
    )
    district_summary = [
        {
            "district": row.district,
            "avg_risk": round(float(row.avg_risk), 2),
            "latitude": round(float(row.latitude), 6),
            "longitude": round(float(row.longitude), 6),
            "records": int(row.records),
        }
        for row in district_summary_rows
    ]

    building_summary_rows = (
        db.query(
            Customer.building_id.label("building_id"),
            Customer.district.label("district"),
            func.avg(CustomerRiskSummary.risk_score).label("avg_risk"),
            func.avg(Customer.latitude).label("latitude"),
            func.avg(Customer.longitude).label("longitude"),
            func.count(CustomerRiskSummary.id).label("records"),
        )
        .join(CustomerRiskSummary, CustomerRiskSummary.customer_id == Customer.customer_id)
        .group_by(Customer.building_id, Customer.district)
        .all()
    )
    building_summary = [
        {
            "building_id": row.building_id,
            "district": row.district,
            "avg_risk": round(float(row.avg_risk), 2),
            "latitude": round(float(row.latitude), 6),
            "longitude": round(float(row.longitude), 6),
            "records": int(row.records),
        }
        for row in building_summary_rows
    ]

    hotspots = sorted(building_summary, key=lambda x: x["avg_risk"], reverse=True)[:50]
    hotspots = [spot for spot in hotspots if spot["avg_risk"] >= 65]

    return HeatmapResponse(
        district_summary=district_summary,
        building_summary=building_summary,
        hotspots=hotspots,
    )
