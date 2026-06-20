"""Fraud injection for ~10% of customers.

Implements the five non-technical-loss patterns VoltGuard must detect. Each
injected customer is labelled with a `fraud_type`, and every affected monthly
record is flagged with `anomaly = 1` and the matching `anomaly_type`.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class FraudInjectionConfig:
    fraud_ratio: float = 0.10
    min_anomaly_months: int = 3
    max_anomaly_months: int = 8


FRAUD_TYPES = [
    "Meter Tampering",
    "Illegal Connection",
    "Seasonal Manipulation",
    "Neighborhood Anomaly",
    "Gradual Theft",
]


def inject_fraud(
    customers_df: pd.DataFrame,
    consumption_df: pd.DataFrame,
    rng: np.random.Generator,
    config: FraudInjectionConfig | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    cfg = config or FraudInjectionConfig()
    customers = customers_df.copy()
    consumption = consumption_df.copy()

    fraud_count = max(1, int(len(customers) * cfg.fraud_ratio))
    fraud_customer_ids = rng.choice(
        customers["customer_id"].values, size=fraud_count, replace=False
    )
    assigned_types = rng.choice(FRAUD_TYPES, size=fraud_count, replace=True)
    fraud_map = dict(zip(fraud_customer_ids, assigned_types))
    customers["fraud_type"] = customers["customer_id"].map(fraud_map)

    consumption["anomaly"] = 0
    consumption["anomaly_type"] = None

    for customer_id, fraud_type in fraud_map.items():
        mask = consumption["customer_id"] == customer_id
        rows = consumption[mask].sort_values(["year", "month"])
        if rows.empty:
            continue

        window = int(rng.integers(cfg.min_anomaly_months, cfg.max_anomaly_months + 1))
        window = min(window, len(rows))
        affected_idx = _apply_fraud(consumption, rows, fraud_type, window, rng)

        consumption.loc[affected_idx, "anomaly"] = 1
        consumption.loc[affected_idx, "anomaly_type"] = fraud_type

    consumption["consumption_kwh"] = consumption["consumption_kwh"].clip(lower=5).round(2)
    return customers, consumption


def _apply_fraud(
    consumption: pd.DataFrame,
    rows: pd.DataFrame,
    fraud_type: str,
    window: int,
    rng: np.random.Generator,
) -> pd.Index:
    if fraud_type == "Meter Tampering":
        # Sudden, sustained 70-90% drop over the most recent months.
        target_idx = rows.tail(window).index
        factor = float(rng.uniform(0.10, 0.30))
        consumption.loc[target_idx, "consumption_kwh"] *= factor
        return target_idx

    if fraud_type == "Illegal Connection":
        # Reported usage drops while the underlying pattern becomes erratic and
        # inconsistent with the customer's clean seasonal shape.
        target_idx = rows.tail(window).index
        factor = float(rng.uniform(0.45, 0.70))
        base = consumption.loc[target_idx, "consumption_kwh"] * factor
        noise = rng.normal(0, base.abs() * 0.35)
        consumption.loc[target_idx, "consumption_kwh"] = base.values + noise
        return target_idx

    if fraud_type == "Seasonal Manipulation":
        # Winter consumption abnormally low vs expected heating demand.
        winter_rows = rows[rows["season"] == "winter"]
        if winter_rows.empty:
            winter_rows = rows.tail(window)
        target_idx = winter_rows.index
        factor = float(rng.uniform(0.30, 0.50))
        consumption.loc[target_idx, "consumption_kwh"] *= factor
        return target_idx

    if fraud_type == "Neighborhood Anomaly":
        # The customer deviates strongly below the rest of the building.
        target_idx = rows.tail(min(len(rows), 12)).index
        factor = float(rng.uniform(0.25, 0.45))
        consumption.loc[target_idx, "consumption_kwh"] *= factor
        return target_idx

    if fraud_type == "Gradual Theft":
        # Slow decline ramping down over the window (1.0 -> ~0.30).
        target_idx = rows.tail(window).index
        ramp = np.linspace(1.0, float(rng.uniform(0.25, 0.40)), num=len(target_idx))
        consumption.loc[target_idx, "consumption_kwh"] *= ramp
        return target_idx

    return rows.tail(window).index
