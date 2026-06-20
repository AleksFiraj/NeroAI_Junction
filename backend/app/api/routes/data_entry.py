"""Inspector data-entry endpoints: add monthly readings + review actions.

New readings are stored and the analysis (which retrains the Isolation Forest)
is re-run so the ML keeps learning from the latest data.
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Consumption, Customer, InspectorAction
from app.db.session import get_db
from app.schemas.admin import ActionResponse, AddConsumptionRequest, ReviewRequest
from app.services.pipeline import run_full_analysis
from app.utils.tirana import is_holiday_month, month_to_season, temperature_for_month, winter_factor

router = APIRouter()

_rng = np.random.default_rng()


def _next_period(year: int, month: int) -> tuple[int, int]:
    if month >= 12:
        return year + 1, 1
    return year, month + 1


def _latest_period(db: Session, customer_id: str | None = None) -> tuple[int, int] | None:
    query = db.query(Consumption.year, Consumption.month)
    if customer_id:
        query = query.filter(Consumption.customer_id == customer_id)
    row = query.order_by(Consumption.year.desc(), Consumption.month.desc()).first()
    return (row.year, row.month) if row else None


def _simulate_value(customer: Customer, month: int) -> float:
    profile = customer.customer_profile if isinstance(customer.customer_profile, dict) else {}
    winter = float(profile.get("expected_winter_kwh") or 350.0)
    summer = float(profile.get("expected_summer_kwh") or 250.0)
    wf = winter_factor(temperature_for_month(month))
    base = summer + (winter - summer) * wf
    if is_holiday_month(month):
        base *= 0.80 if customer.property_type == "Business" else 0.9
    base += float(_rng.normal(0, base * 0.05))
    return round(max(10.0, base), 2)


@router.post("/consumption/{customer_id}", response_model=ActionResponse)
def add_consumption(
    customer_id: str,
    payload: AddConsumptionRequest,
    db: Session = Depends(get_db),
) -> ActionResponse:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.year and payload.month:
        year, month = payload.year, payload.month
    else:
        latest = _latest_period(db, customer_id) or _latest_period(db)
        if latest is None:
            raise HTTPException(status_code=400, detail="No existing data to extend")
        year, month = _next_period(*latest)

    existing = (
        db.query(Consumption)
        .filter(
            Consumption.customer_id == customer_id,
            Consumption.year == year,
            Consumption.month == month,
        )
        .first()
    )
    if existing:
        existing.consumption_kwh = payload.consumption_kwh
    else:
        db.add(
            Consumption(
                customer_id=customer_id,
                year=year,
                month=month,
                season=month_to_season(month),
                temperature=temperature_for_month(month),
                holiday_month=is_holiday_month(month),
                consumption_kwh=payload.consumption_kwh,
                anomaly=0,
                anomaly_type=None,
            )
        )
    db.commit()

    result = run_full_analysis(db)
    return ActionResponse(
        message="Reading stored and model re-trained",
        customer_id=customer_id,
        year=year,
        month=month,
        records_analyzed=result.records_analyzed,
    )


@router.post("/advance-month", response_model=ActionResponse)
def advance_month(db: Session = Depends(get_db)) -> ActionResponse:
    latest = _latest_period(db)
    if latest is None:
        raise HTTPException(status_code=400, detail="No dataset to advance")
    year, month = _next_period(*latest)

    customers = db.query(Customer).all()
    rows = [
        Consumption(
            customer_id=c.customer_id,
            year=year,
            month=month,
            season=month_to_season(month),
            temperature=temperature_for_month(month),
            holiday_month=is_holiday_month(month),
            consumption_kwh=_simulate_value(c, month),
            anomaly=0,
            anomaly_type=None,
        )
        for c in customers
    ]
    db.add_all(rows)
    db.commit()

    result = run_full_analysis(db)
    return ActionResponse(
        message=f"Advanced to {year}-{month:02d} and re-trained model",
        year=year,
        month=month,
        records_analyzed=result.records_analyzed,
    )


@router.post("/customer/{customer_id}/review", response_model=ActionResponse)
def review_customer(
    customer_id: str,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
) -> ActionResponse:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.review_status = payload.status
    db.add(
        InspectorAction(
            customer_id=customer_id,
            action_type=payload.status,
            notes=payload.note,
        )
    )
    db.commit()
    return ActionResponse(message=f"Customer marked as {payload.status}", customer_id=customer_id)
