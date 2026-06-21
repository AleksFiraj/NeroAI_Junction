from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Consumption, Customer, CustomerRiskSummary, RiskAssessment
from app.db.session import get_db
from app.schemas.customer import CustomerListItem
from app.schemas.dashboard import DashboardResponse, KpiCard

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardResponse:
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_anomalies = db.query(func.count(Consumption.id)).filter(Consumption.anomaly == 1).scalar() or 0

    latest = db.query(CustomerRiskSummary).all()

    critical = sum(1 for r in latest if r.status == "Critical")
    suspicious = sum(1 for r in latest if r.status == "Suspicious")
    normal = sum(1 for r in latest if r.status == "Normal")
    high_risk_count = critical + suspicious

    district_rows = (
        db.query(
            Customer.district.label("district"),
            func.avg(CustomerRiskSummary.risk_score).label("avg_risk"),
            func.count(CustomerRiskSummary.id).label("records"),
        )
        .join(CustomerRiskSummary, CustomerRiskSummary.customer_id == Customer.customer_id)
        .group_by(Customer.district)
        .all()
    )
    district_risk = [
        {"district": row.district, "avg_risk": round(float(row.avg_risk), 2), "records": int(row.records)}
        for row in district_rows
    ]
    high_risk_areas = sum(1 for d in district_risk if d["avg_risk"] > 45)
    estimated_losses = round(sum(r.estimated_loss_eur or 0.0 for r in latest), 2)

    kpis = [
        KpiCard(label="Total Customers", value=float(total_customers)),
        KpiCard(label="High-Risk Customers", value=float(high_risk_count)),
        KpiCard(label="High-Risk Areas", value=float(high_risk_areas)),
        KpiCard(label="Est. Financial Losses", value=float(estimated_losses), unit="€"),
        KpiCard(label="Anomalies Detected", value=float(total_anomalies)),
    ]

    customers = {c.customer_id: c for c in db.query(Customer).all()}
    top = sorted(latest, key=lambda r: r.risk_score, reverse=True)[:10]
    top_customers = [
        CustomerListItem(
            customer_id=row.customer_id,
            name=customers[row.customer_id].name if row.customer_id in customers else "",
            building_id=customers[row.customer_id].building_id if row.customer_id in customers else "N/A",
            district=customers[row.customer_id].district if row.customer_id in customers else "N/A",
            property_type=customers[row.customer_id].property_type if row.customer_id in customers else "N/A",
            fraud_type=customers[row.customer_id].fraud_type if row.customer_id in customers else None,
            review_status=customers[row.customer_id].review_status if row.customer_id in customers else "open",
            risk_score=row.risk_score,
            confidence_score=row.confidence_score,
            estimated_loss_eur=row.estimated_loss_eur,
            loss_label=row.loss_label or "",
            status=row.status,
        )
        for row in top
    ]

    trend_rows = (
        db.query(
            RiskAssessment.year,
            RiskAssessment.month,
            func.avg(RiskAssessment.risk_score).label("avg_risk"),
            func.count(RiskAssessment.id).label("records"),
        )
        .group_by(RiskAssessment.year, RiskAssessment.month)
        .order_by(RiskAssessment.year.asc(), RiskAssessment.month.asc())
        .all()
    )
    anomalies_over_time = [
        {"year": row.year, "month": row.month, "avg_risk": round(float(row.avg_risk), 2), "records": int(row.records)}
        for row in trend_rows
    ]

    return DashboardResponse(
        kpis=kpis,
        risk_distribution={"Normal": normal, "Suspicious": suspicious, "Critical": critical},
        top_risky_customers=top_customers,
        district_risk=district_risk,
        anomalies_over_time=anomalies_over_time,
    )
