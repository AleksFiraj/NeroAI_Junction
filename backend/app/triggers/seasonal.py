"""Seasonal triggers (temperature- and season-aware)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.triggers.base import GROUP_SEASONAL, TriggerSpec, register


def _winter_under(df: pd.DataFrame) -> pd.Series:
    is_winter = (df["season"] == "winter").astype(float)
    return (df["seasonal_shortfall"] * is_winter).clip(0, 1)


register(
    TriggerSpec(
        name="winter_underconsumption_trigger",
        group=GROUP_SEASONAL,
        threshold="winter usage > 35% below expected winter level",
        evidence_window="winter months",
        features_used=["season", "seasonal_shortfall", "expected_usage_by_month"],
        fire_threshold=0.35,
        score_fn=_winter_under,
        reason_fn=lambda r: (
            f"Winter consumption is {r['seasonal_shortfall'] * 100:.0f}% below the "
            "expected heating level for this customer."
        ),
    )
)


def _seasonal_inconsistency(df: pd.DataFrame) -> pd.Series:
    return ((1.15 - df["seasonal_ratio"]) / 0.6).clip(0, 1)


register(
    TriggerSpec(
        name="seasonal_inconsistency_trigger",
        group=GROUP_SEASONAL,
        threshold="winter/summer ratio < 1.15 (expected > 1.2)",
        evidence_window="full 24-month seasonal profile",
        features_used=["seasonal_ratio", "winter_avg", "summer_avg"],
        fire_threshold=0.40,
        score_fn=_seasonal_inconsistency,
        reason_fn=lambda r: (
            f"Seasonal pattern is inconsistent: winter/summer ratio is "
            f"{r['seasonal_ratio']:.2f}, below the expected heating ratio."
        ),
    )
)

register(
    TriggerSpec(
        name="temperature_mismatch_trigger",
        group=GROUP_SEASONAL,
        threshold="usage > 35% below temperature-adjusted expectation",
        evidence_window="current month vs own temperature-adjusted norm",
        features_used=["temperature", "temperature_adjusted_usage", "temperature_mismatch_score"],
        fire_threshold=0.35,
        score_fn=lambda df: df["temperature_mismatch_score"],
        reason_fn=lambda r: (
            f"Consumption is {r['temperature_mismatch_score'] * 100:.0f}% lower than "
            f"expected for {r['temperature']:.0f} degrees C."
        ),
    )
)
