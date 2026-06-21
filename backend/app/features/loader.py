"""Load the consumption + customer context into a single tidy frame."""

from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import Consumption, Customer


def load_consumption_frame(db: Session) -> pd.DataFrame:
    rows = (
        db.query(
            Consumption.customer_id,
            Consumption.year,
            Consumption.month,
            Consumption.season,
            Consumption.temperature,
            Consumption.holiday_month,
            Consumption.consumption_kwh,
            Consumption.anomaly,
            Consumption.anomaly_type,
            Customer.building_id,
            Customer.district,
            Customer.property_type,
            Customer.latitude,
            Customer.longitude,
            Customer.customer_profile,
        )
        .join(Customer, Customer.customer_id == Consumption.customer_id)
        .all()
    )
    if not rows:
        return pd.DataFrame()

    frame = pd.DataFrame(
        rows,
        columns=[
            "customer_id",
            "year",
            "month",
            "season",
            "temperature",
            "holiday_month",
            "consumption_kwh",
            "anomaly",
            "anomaly_type",
            "building_id",
            "district",
            "property_type",
            "latitude",
            "longitude",
            "customer_profile",
        ],
    )
    frame["profile"] = frame["customer_profile"].apply(
        lambda p: p.get("archetype") if isinstance(p, dict) else "Unknown"
    )
    frame = frame.drop(columns=["customer_profile"])
    frame["date"] = pd.to_datetime(dict(year=frame.year, month=frame.month, day=1))
    frame = frame.sort_values(["customer_id", "date"]).reset_index(drop=True)
    return frame
