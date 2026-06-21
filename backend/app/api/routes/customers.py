import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Consumption, Customer, CustomerRiskSummary
from app.db.session import get_db
from app.schemas.customer import CustomerConsumptionPoint, CustomerDetail, CustomerListItem

router = APIRouter()


@router.get("/customers", response_model=list[CustomerListItem])
def get_customers(db: Session = Depends(get_db)) -> list[CustomerListItem]:
    customers = db.query(Customer).order_by(Customer.customer_id.asc()).all()
    latest_risks = {
        row.customer_id: row for row in db.query(CustomerRiskSummary).all()
    }

    results: list[CustomerListItem] = []
    for customer in customers:
        risk = latest_risks.get(customer.customer_id)
        results.append(
            CustomerListItem(
                customer_id=customer.customer_id,
                name=customer.name,
                building_id=customer.building_id,
                district=customer.district,
                property_type=customer.property_type,
                latitude=customer.latitude,
                longitude=customer.longitude,
                fraud_type=customer.fraud_type,
                review_status=customer.review_status,
                risk_score=round(risk.risk_score, 2) if risk else None,
                confidence_score=round(risk.confidence_score, 2) if risk else None,
                estimated_loss_eur=round(risk.estimated_loss_eur, 2) if risk else None,
                loss_label=(risk.loss_label or "") if risk else "",
                status=risk.status if risk else None,
            )
        )
    return results


@router.get("/customer/{customer_id}", response_model=CustomerDetail)
def get_customer(customer_id: str, db: Session = Depends(get_db)) -> CustomerDetail:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    history_rows = (
        db.query(Consumption)
        .filter(Consumption.customer_id == customer_id)
        .order_by(Consumption.year.asc(), Consumption.month.asc())
        .all()
    )
    history = [
        CustomerConsumptionPoint(
            year=row.year,
            month=row.month,
            season=row.season,
            temperature=row.temperature,
            consumption_kwh=row.consumption_kwh,
            anomaly=row.anomaly,
            anomaly_type=row.anomaly_type,
        )
        for row in history_rows
    ]

    latest_risk = (
        db.query(CustomerRiskSummary)
        .filter(CustomerRiskSummary.customer_id == customer_id)
        .first()
    )

    reasons: list[str] = []
    comparisons: dict = {}
    triggers: list[dict] = []
    if latest_risk:
        reasons = json.loads(latest_risk.reasons_json)
        comparisons = json.loads(latest_risk.comparisons_json)
        triggers = json.loads(latest_risk.triggers_json or "[]")

    return CustomerDetail(
        customer_id=customer.customer_id,
        name=customer.name,
        building_id=customer.building_id,
        district=customer.district,
        property_type=customer.property_type,
        contract_number=customer.contract_number,
        meter_id=customer.meter_id,
        meter_type=customer.meter_type,
        connection_type=customer.connection_type,
        transformer_id=customer.transformer_id,
        latitude=customer.latitude,
        longitude=customer.longitude,
        customer_profile=customer.customer_profile,
        fraud_type=customer.fraud_type,
        review_status=customer.review_status,
        risk_score=latest_risk.risk_score if latest_risk else None,
        confidence_score=latest_risk.confidence_score if latest_risk else None,
        estimated_loss_eur=latest_risk.estimated_loss_eur if latest_risk else None,
        loss_label=(latest_risk.loss_label or "") if latest_risk else "",
        status=latest_risk.status if latest_risk else None,
        groups_fired=latest_risk.groups_fired if latest_risk else None,
        reasons=reasons,
        comparisons=comparisons,
        triggers=triggers,
        consumption_history=history,
    )
