"""Inspector data-entry endpoints: add monthly readings + review actions.

New readings are stored and the analysis (which retrains the Isolation Forest)
is re-run so the ML keeps learning from the latest data.
"""

from __future__ import annotations

import csv
import io
import json

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Consumption, Customer, InspectorAction
from app.db.session import get_db
from app.schemas.admin import ActionResponse, AddConsumptionRequest, BulkUploadResponse, ReviewRequest
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


def _parse_bulk_file(contents: bytes, filename: str) -> list[dict]:
    """Parse a CSV or JSON file into a list of {customer_id, consumption_kwh} dicts."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "json":
        try:
            data = json.loads(contents.decode("utf-8-sig"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="JSON must be an array of objects")
        return data

    # Default: treat as CSV
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict] = []
    for row in reader:
        rows.append(row)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no data rows")
    return rows


@router.post("/bulk-upload", response_model=BulkUploadResponse)
def bulk_upload(
    year: int = Form(...),
    month: int = Form(..., ge=1, le=12),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> BulkUploadResponse:
    """Upload bulk consumption data for a given month.

    Accepts CSV or JSON with at least `customer_id` and `consumption_kwh` columns.
    Season, temperature, and holiday flags are derived automatically from the month.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Only .csv and .json files are accepted")

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    rows = _parse_bulk_file(contents, file.filename)

    # Validate that required columns exist
    if rows:
        sample = rows[0]
        if "customer_id" not in sample:
            raise HTTPException(
                status_code=400,
                detail="File must have a 'customer_id' column/field",
            )
        if "consumption_kwh" not in sample:
            raise HTTPException(
                status_code=400,
                detail="File must have a 'consumption_kwh' column/field",
            )

    # Pre-fetch all valid customer IDs for fast lookup
    valid_ids: set[str] = {
        cid for (cid,) in db.query(Customer.customer_id).all()
    }

    inserted = 0
    updated = 0
    skipped = 0
    skipped_ids: list[str] = []

    season = month_to_season(month)
    temperature = temperature_for_month(month)
    holiday = is_holiday_month(month)

    for row in rows:
        cid = str(row.get("customer_id", "")).strip()
        kwh_raw = row.get("consumption_kwh", "")

        # Validate customer_id
        if not cid or cid not in valid_ids:
            skipped += 1
            if cid and len(skipped_ids) < 20:
                skipped_ids.append(cid)
            continue

        # Validate consumption_kwh
        try:
            kwh = float(kwh_raw)
            if kwh <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            skipped += 1
            if len(skipped_ids) < 20:
                skipped_ids.append(f"{cid} (invalid kWh)")
            continue

        # Upsert
        existing = (
            db.query(Consumption)
            .filter(
                Consumption.customer_id == cid,
                Consumption.year == year,
                Consumption.month == month,
            )
            .first()
        )
        if existing:
            existing.consumption_kwh = kwh
            updated += 1
        else:
            db.add(
                Consumption(
                    customer_id=cid,
                    year=year,
                    month=month,
                    season=season,
                    temperature=temperature,
                    holiday_month=holiday,
                    consumption_kwh=kwh,
                    anomaly=0,
                    anomaly_type=None,
                )
            )
            inserted += 1

    db.commit()

    # Re-train ML on updated data
    result = run_full_analysis(db)

    return BulkUploadResponse(
        message=f"Bulk upload complete for {year}-{month:02d}",
        year=year,
        month=month,
        rows_inserted=inserted,
        rows_updated=updated,
        rows_skipped=skipped,
        skipped_ids=skipped_ids,
        records_analyzed=result.records_analyzed,
    )
