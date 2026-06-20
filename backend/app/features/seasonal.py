"""Seasonal features (temperature- and season-aware self comparison)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def add_seasonal_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    winter_avg = (
        df[df["season"] == "winter"].groupby("customer_id")["consumption_kwh"].mean()
    )
    summer_avg = (
        df[df["season"] == "summer"].groupby("customer_id")["consumption_kwh"].mean()
    )
    df["winter_avg"] = df["customer_id"].map(winter_avg)
    df["summer_avg"] = df["customer_id"].map(summer_avg)
    df["winter_avg"] = df["winter_avg"].fillna(df["consumption_kwh"])
    df["summer_avg"] = df["summer_avg"].fillna(df["consumption_kwh"])
    df["seasonal_ratio"] = (
        df["winter_avg"] / df["summer_avg"].replace(0, np.nan)
    ).replace([np.inf, -np.inf], 1.0).fillna(1.0)

    # Expected usage for this calendar month = customer's own typical level.
    df["expected_usage_by_month"] = df.groupby(["customer_id", "month"])[
        "consumption_kwh"
    ].transform("median")

    rel_dev = (df["expected_usage_by_month"] - df["consumption_kwh"]) / df[
        "expected_usage_by_month"
    ].replace(0, np.nan)
    rel_dev = rel_dev.replace([np.inf, -np.inf], 0).fillna(0.0)
    # Positive => under-consuming vs own seasonal expectation.
    df["seasonal_shortfall"] = rel_dev.clip(lower=0, upper=1)
    df["seasonal_deviation_score"] = rel_dev.abs().clip(0, 1)

    # Heating-demand proxy: colder months should drive more usage. Normalize
    # consumption by an estimated demand factor so a warm-month and cold-month
    # value become comparable.
    demand_factor = 1.0 + (21.0 - df["temperature"]).clip(lower=0) / 16.0
    df["temperature_adjusted_usage"] = df["consumption_kwh"] / demand_factor

    # Temperature-mismatch helper: how far below the customer's own
    # temperature-adjusted norm the current month sits (0..1).
    taj_median = df.groupby("customer_id")["temperature_adjusted_usage"].transform(
        "median"
    )
    taj_shortfall = (taj_median - df["temperature_adjusted_usage"]) / taj_median.replace(
        0, np.nan
    )
    df["temperature_mismatch_score"] = (
        taj_shortfall.replace([np.inf, -np.inf], 0).fillna(0.0).clip(0, 1)
    )
    return df
