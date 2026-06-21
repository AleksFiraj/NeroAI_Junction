import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import CustomerRiskSummary
from app.db.session import get_db
from app.schemas.risk import RiskResponse

router = APIRouter()


@router.get("/risk/{customer_id}", response_model=RiskResponse)
def get_risk(customer_id: str, db: Session = Depends(get_db)) -> RiskResponse:
    latest = (
        db.query(CustomerRiskSummary)
        .filter(CustomerRiskSummary.customer_id == customer_id)
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="Risk data not found for customer")

    return RiskResponse(
        customer_id=latest.customer_id,
        year=latest.year,
        month=latest.month,
        anomaly_score=latest.anomaly_score,
        personal_anomaly=latest.personal_anomaly,
        seasonal_deviation=latest.seasonal_deviation,
        peer_deviation=latest.peer_deviation,
        geographic_anomaly=latest.geographic_anomaly,
        risk_score=latest.risk_score,
        confidence_score=latest.confidence_score,
        status=latest.status,
        groups_fired=latest.groups_fired,
        estimated_loss_eur=latest.estimated_loss_eur,
        loss_label=latest.loss_label or "",
        reasons=json.loads(latest.reasons_json),
        comparisons=json.loads(latest.comparisons_json),
        triggers=json.loads(latest.triggers_json or "[]"),
    )
