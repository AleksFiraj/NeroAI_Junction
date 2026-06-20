"""Load shape features (curve similarity vs own history and vs peers)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def _safe_corr(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 3 or len(b) < 3:
        return 0.0
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0
    corr = np.corrcoef(a, b)[0, 1]
    if np.isnan(corr):
        return 0.0
    return float(corr)


def add_shape_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["customer_id", "date"]).reset_index(drop=True)

    own_corr: dict[str, float] = {}
    peer_corr: dict[str, float] = {}
    shape_dist: dict[str, float] = {}

    for customer_id, group in df.groupby("customer_id"):
        g = group.sort_values("date")
        actual = g["consumption_kwh"].to_numpy(dtype=float)
        expected = g["expected_usage_by_month"].to_numpy(dtype=float)
        peer = g["peer_mean"].to_numpy(dtype=float)

        own_corr[customer_id] = _safe_corr(actual, expected)
        peer_corr[customer_id] = _safe_corr(actual, peer)

        # Normalized shape distance vs the building peer curve.
        a_mean = actual.mean() if actual.mean() != 0 else 1.0
        p_mean = peer.mean() if peer.mean() != 0 else 1.0
        a_norm = actual / a_mean
        p_norm = peer / p_mean
        dist = float(np.sqrt(np.mean((a_norm - p_norm) ** 2)))
        shape_dist[customer_id] = min(1.0, dist)

    df["correlation_with_own_history"] = df["customer_id"].map(own_corr).fillna(0.0)
    df["correlation_with_peers"] = df["customer_id"].map(peer_corr).fillna(0.0)
    df["shape_distance_score"] = df["customer_id"].map(shape_dist).fillna(0.0)
    return df
