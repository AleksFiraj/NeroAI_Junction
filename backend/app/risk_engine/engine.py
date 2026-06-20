"""Final risk engine.

Aggregates trigger scores into the four spec-weighted components, then applies
a multi-group agreement gate so the score only climbs when several independent
trigger groups concur. No single trigger or group can dominate the score.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.triggers.base import (
    GROUP_GEOGRAPHIC,
    GROUP_LOAD_SHAPE,
    GROUP_METER_INTEGRITY,
    GROUP_PEER,
    GROUP_SEASONAL,
    GROUP_SELF_BEHAVIOR,
    GROUPS,
    TRIGGER_REGISTRY,
)

# Component weights (must sum to 1.0).
W_SELF = 0.30
W_SEASONAL = 0.25
W_PEER = 0.25
W_GEOSHAPE = 0.20

CRITICAL_THRESHOLD = 65.0
SUSPICIOUS_THRESHOLD = 38.0


def _group_columns(group: str) -> list[str]:
    return [f"trig__{spec.name}" for spec in TRIGGER_REGISTRY if spec.group == group]


def _prob_or(df: pd.DataFrame, columns: list[str]) -> pd.Series:
    """Soft OR: 1 - prod(1 - score_i). Rewards corroborating triggers, caps at 1."""
    if not columns:
        return pd.Series(0.0, index=df.index)
    complement = pd.Series(1.0, index=df.index)
    for col in columns:
        complement = complement * (1.0 - df[col].clip(0, 1))
    return (1.0 - complement).clip(0, 1)


def _group_fired(df: pd.DataFrame, group: str) -> pd.Series:
    fired = pd.Series(False, index=df.index)
    for spec in TRIGGER_REGISTRY:
        if spec.group != group:
            continue
        fired = fired | (df[f"trig__{spec.name}"] >= spec.fire_threshold)
    return fired


def apply_risk_engine(scored_df: pd.DataFrame) -> pd.DataFrame:
    if scored_df.empty:
        return scored_df

    df = scored_df.copy()
    if "anomaly_score" not in df:
        df["anomaly_score"] = 0.0

    self_groups = _prob_or(
        df, _group_columns(GROUP_SELF_BEHAVIOR) + _group_columns(GROUP_METER_INTEGRITY)
    )
    # Isolation Forest corroborates self-behavior but is capped so it cannot dominate.
    ml_signal = (0.5 * df["anomaly_score"]).clip(0, 0.5)
    df["personal_anomaly"] = (1.0 - (1.0 - self_groups) * (1.0 - ml_signal)).clip(0, 1)

    df["seasonal_deviation"] = _prob_or(df, _group_columns(GROUP_SEASONAL))
    df["peer_deviation"] = _prob_or(df, _group_columns(GROUP_PEER))
    df["geographic_anomaly"] = _prob_or(
        df, _group_columns(GROUP_GEOGRAPHIC) + _group_columns(GROUP_LOAD_SHAPE)
    )

    risk_raw = (
        W_SELF * df["personal_anomaly"]
        + W_SEASONAL * df["seasonal_deviation"]
        + W_PEER * df["peer_deviation"]
        + W_GEOSHAPE * df["geographic_anomaly"]
    )

    groups_fired = pd.Series(0, index=df.index)
    for group in GROUPS:
        groups_fired = groups_fired + _group_fired(df, group).astype(int)
    df["groups_fired"] = groups_fired

    agreement_factor = np.select(
        [groups_fired >= 3, groups_fired == 2, groups_fired == 1],
        [1.0, 0.85, 0.40],
        default=0.0,
    )
    df["risk_score"] = (risk_raw * agreement_factor * 100).clip(0, 100).round(2)

    df["confidence_score"] = (
        (0.55 * (groups_fired.clip(0, 3) / 3.0) + 0.45 * risk_raw) * 100
    ).clip(0, 100).round(2)

    df["status"] = np.select(
        [df["risk_score"] >= CRITICAL_THRESHOLD, df["risk_score"] >= SUSPICIOUS_THRESHOLD],
        ["Critical", "Suspicious"],
        default="Normal",
    )
    return df
