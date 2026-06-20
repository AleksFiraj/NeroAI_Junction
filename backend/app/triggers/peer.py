"""Peer comparison triggers (customer vs building / profile peers)."""

from __future__ import annotations

import pandas as pd

from app.triggers.base import GROUP_PEER, TriggerSpec, register


def _peer_ratio(dev: float) -> float:
    # dev = (usage - peer_mean) / peer_mean. Negative => below peers.
    denom = 1.0 + dev
    if denom <= 0.05:
        return 20.0
    return 1.0 / denom


def _peer_deviation_score(df: pd.DataFrame) -> pd.Series:
    return (-df["deviation_from_building_avg"] / 0.6).clip(0, 1)


register(
    TriggerSpec(
        name="peer_deviation_trigger",
        group=GROUP_PEER,
        threshold="> 40% below building average",
        evidence_window="current month, same building",
        features_used=["deviation_from_building_avg", "peer_mean"],
        fire_threshold=0.45,
        score_fn=_peer_deviation_score,
        reason_fn=lambda r: (
            f"Usage is {_peer_ratio(r['deviation_from_building_avg']):.1f}x lower than "
            f"the building average in {r['district']}."
        ),
    )
)


def _building_outlier_score(df: pd.DataFrame) -> pd.Series:
    low_rank = ((0.30 - df["building_rank_norm"]) / 0.30).clip(0, 1)
    below = (df["deviation_from_building_avg"] < 0).astype(float)
    return (low_rank * below).clip(0, 1)


register(
    TriggerSpec(
        name="building_outlier_trigger",
        group=GROUP_PEER,
        threshold="within lowest 30% of building consumers",
        evidence_window="current month, same building",
        features_used=["building_rank_norm", "deviation_from_building_avg"],
        fire_threshold=0.50,
        score_fn=_building_outlier_score,
        reason_fn=lambda r: (
            f"Customer ranks in the lowest {r['building_rank_norm'] * 100:.0f}% of "
            "consumers in the building."
        ),
    )
)


def _zscore_score(df: pd.DataFrame) -> pd.Series:
    return (-df["z_score_vs_peers"] / 2.5).clip(0, 1)


register(
    TriggerSpec(
        name="z_score_anomaly_trigger",
        group=GROUP_PEER,
        threshold="z-score < -1.0 vs building peers",
        evidence_window="current month, same building",
        features_used=["z_score_vs_peers", "peer_mean", "peer_std"],
        fire_threshold=0.40,
        score_fn=_zscore_score,
        reason_fn=lambda r: (
            f"Consumption is {abs(r['z_score_vs_peers']):.1f} standard deviations below "
            "building peers."
        ),
    )
)
