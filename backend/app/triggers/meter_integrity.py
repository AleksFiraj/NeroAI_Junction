"""Meter integrity triggers (signal plausibility / tampering signatures)."""

from __future__ import annotations

import pandas as pd

from app.triggers.base import GROUP_METER_INTEGRITY, TriggerSpec, register


def _flatline_score(df: pd.DataFrame) -> pd.Series:
    # Near-zero variability => possible stuck / bypassed meter.
    return ((0.05 - df["volatility_index"]) / 0.05).clip(0, 1)


register(
    TriggerSpec(
        name="flatline_usage_trigger",
        group=GROUP_METER_INTEGRITY,
        threshold="coefficient of variation < 0.05 over trailing 6 months",
        evidence_window="trailing 6 months",
        features_used=["volatility_index", "rolling_std_6m"],
        fire_threshold=0.50,
        score_fn=_flatline_score,
        reason_fn=lambda r: (
            "Near-flat consumption detected with almost no month-to-month variation."
        ),
    )
)

register(
    TriggerSpec(
        name="repeated_values_trigger",
        group=GROUP_METER_INTEGRITY,
        threshold="> 50% of recent months repeat the prior reading",
        evidence_window="trailing 6 months",
        features_used=["repeated_value_score"],
        fire_threshold=0.50,
        score_fn=lambda df: df["repeated_value_score"],
        reason_fn=lambda r: (
            "Repeated near-identical meter readings across consecutive months."
        ),
    )
)


def _abnormal_stability_score(df: pd.DataFrame) -> pd.Series:
    flat_seasons = ((1.20 - df["seasonal_ratio"]) / 0.4).clip(0, 1)
    low_vol = ((0.20 - df["volatility_index"]) / 0.20).clip(0, 1)
    return pd.concat([flat_seasons, low_vol], axis=1).min(axis=1)


register(
    TriggerSpec(
        name="abnormal_stability_trigger",
        group=GROUP_METER_INTEGRITY,
        threshold="flat across seasons (ratio < 1.2) with low volatility",
        evidence_window="full 24-month profile",
        features_used=["seasonal_ratio", "volatility_index"],
        fire_threshold=0.40,
        score_fn=_abnormal_stability_score,
        reason_fn=lambda r: (
            "Consumption is abnormally stable across seasons, inconsistent with "
            "heating/cooling demand."
        ),
    )
)
