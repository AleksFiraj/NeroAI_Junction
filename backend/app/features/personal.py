"""Personal behavior features (per-customer self-history)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def _slope(values: np.ndarray) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=float)
    try:
        slope = np.polyfit(x, values, 1)[0]
    except (np.linalg.LinAlgError, ValueError):
        return 0.0
    return float(slope)


def add_personal_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["customer_id", "date"]).reset_index(drop=True)
    grouped = df.groupby("customer_id", group_keys=False)
    kwh = df["consumption_kwh"]

    df["rolling_mean_3m"] = grouped["consumption_kwh"].transform(
        lambda s: s.rolling(3, min_periods=1).mean()
    )
    df["rolling_mean_6m"] = grouped["consumption_kwh"].transform(
        lambda s: s.rolling(6, min_periods=1).mean()
    )
    df["rolling_std_6m"] = grouped["consumption_kwh"].transform(
        lambda s: s.rolling(6, min_periods=2).std().fillna(0.0)
    )

    raw_slope = grouped["consumption_kwh"].transform(
        lambda s: s.rolling(6, min_periods=3).apply(_slope, raw=True).fillna(0.0)
    )
    df["trend_slope"] = (raw_slope / df["rolling_mean_6m"].replace(0, np.nan)).replace(
        [np.inf, -np.inf], 0
    ).fillna(0.0)

    df["month_over_month_change"] = (
        grouped["consumption_kwh"].pct_change().replace([np.inf, -np.inf], 0).fillna(0.0)
    )

    # Prior baseline = mean of the previous 3 months (shifted so "current" excluded).
    prior_baseline = grouped["consumption_kwh"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )
    drop = 1.0 - (kwh / prior_baseline.replace(0, np.nan))
    df["sudden_drop_score"] = drop.clip(lower=0, upper=1).fillna(0.0)

    df["volatility_index"] = (
        df["rolling_std_6m"] / df["rolling_mean_6m"].replace(0, np.nan)
    ).replace([np.inf, -np.inf], 0).fillna(0.0).clip(0, 3)

    # Long-run customer baseline (expanding mean, shifted to avoid leakage).
    baseline = grouped["consumption_kwh"].transform(
        lambda s: s.expanding(min_periods=1).mean().shift(1)
    )
    baseline = baseline.fillna(df["consumption_kwh"])
    is_low = (kwh < 0.6 * baseline).astype(float)
    df["persistence_low_usage_score"] = (
        is_low.groupby(df["customer_id"], group_keys=False)
        .apply(lambda s: s.rolling(3, min_periods=1).mean())
        .clip(0, 1)
    )

    # Meter-integrity helper: share of recent months whose reading barely moved
    # from the prior month (near-identical repeated readings).
    repeated = (grouped["consumption_kwh"].diff().abs() < 1.0).astype(float)
    df["repeated_value_score"] = (
        repeated.groupby(df["customer_id"], group_keys=False)
        .apply(lambda s: s.rolling(6, min_periods=2).mean())
        .fillna(0.0)
        .clip(0, 1)
    )
    return df
