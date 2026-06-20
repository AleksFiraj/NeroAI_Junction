"""Load shape triggers (curve similarity vs peers and own history)."""

from __future__ import annotations

import pandas as pd

from app.triggers.base import GROUP_LOAD_SHAPE, TriggerSpec, register


def _shape_distance_score(df: pd.DataFrame) -> pd.Series:
    return (df["shape_distance_score"] / 0.6).clip(0, 1)


register(
    TriggerSpec(
        name="consumption_shape_distance_trigger",
        group=GROUP_LOAD_SHAPE,
        threshold="normalized curve distance vs peers > 0.6",
        evidence_window="full 24-month curve vs peer curve",
        features_used=["shape_distance_score", "correlation_with_peers"],
        fire_threshold=0.40,
        score_fn=_shape_distance_score,
        reason_fn=lambda r: (
            "Consumption curve shape differs markedly from comparable building peers."
        ),
    )
)


def _pattern_break_score(df: pd.DataFrame) -> pd.Series:
    # correlation_with_own_history in [-1, 1]; +0.5 -> 0 score, -0.4 -> ~1.
    return ((0.5 - df["correlation_with_own_history"]) / 0.9).clip(0, 1)


register(
    TriggerSpec(
        name="historical_pattern_break_trigger",
        group=GROUP_LOAD_SHAPE,
        threshold="correlation with own seasonal pattern < 0.5",
        evidence_window="full 24-month history",
        features_used=["correlation_with_own_history", "expected_usage_by_month"],
        fire_threshold=0.45,
        score_fn=_pattern_break_score,
        reason_fn=lambda r: (
            "Recent consumption breaks the customer's own historical seasonal pattern."
        ),
    )
)
