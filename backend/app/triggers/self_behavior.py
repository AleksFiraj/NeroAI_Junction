"""Self-behavior triggers (customer vs their own history)."""

from __future__ import annotations

import pandas as pd

from app.triggers.base import GROUP_SELF_BEHAVIOR, TriggerSpec, register

register(
    TriggerSpec(
        name="sudden_drop_trigger",
        group=GROUP_SELF_BEHAVIOR,
        threshold="drop > 40% vs prior 3-month baseline",
        evidence_window="current month vs previous 3 months",
        features_used=["consumption_kwh", "rolling_mean_3m", "sudden_drop_score"],
        fire_threshold=0.40,
        score_fn=lambda df: df["sudden_drop_score"],
        reason_fn=lambda r: (
            f"Sudden {r['sudden_drop_score'] * 100:.0f}% drop in consumption "
            "compared to the recent baseline."
        ),
    )
)

register(
    TriggerSpec(
        name="low_usage_persistence_trigger",
        group=GROUP_SELF_BEHAVIOR,
        threshold=">= 2 of last 3 months below 60% of long-run baseline",
        evidence_window="last 3 months",
        features_used=["persistence_low_usage_score"],
        fire_threshold=0.50,
        score_fn=lambda df: df["persistence_low_usage_score"],
        reason_fn=lambda r: (
            "Persistent low consumption detected over the last "
            f"{round(r['persistence_low_usage_score'] * 3)} of 3 months."
        ),
    )
)


def _volatility_score(df: pd.DataFrame) -> pd.Series:
    return ((df["volatility_index"] - 0.35) / 0.45).clip(0, 1)


register(
    TriggerSpec(
        name="volatility_anomaly_trigger",
        group=GROUP_SELF_BEHAVIOR,
        threshold="coefficient of variation > 0.35 over trailing 6 months",
        evidence_window="trailing 6 months",
        features_used=["volatility_index", "rolling_std_6m", "rolling_mean_6m"],
        fire_threshold=0.50,
        score_fn=_volatility_score,
        reason_fn=lambda r: (
            f"Abnormal consumption volatility (variation index {r['volatility_index']:.2f})."
        ),
    )
)
