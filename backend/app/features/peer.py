"""Peer comparison features (building / district / profile groupings)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def add_peer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    bm = df.groupby(["building_id", "year", "month"])["consumption_kwh"]
    df["peer_mean"] = bm.transform("mean")
    df["peer_std"] = bm.transform("std").fillna(0.0)
    df["peer_count"] = bm.transform("count")

    df["z_score_vs_peers"] = (
        (df["consumption_kwh"] - df["peer_mean"]) / df["peer_std"].replace(0, np.nan)
    ).replace([np.inf, -np.inf], 0).fillna(0.0)

    df["deviation_from_building_avg"] = (
        (df["consumption_kwh"] - df["peer_mean"]) / df["peer_mean"].replace(0, np.nan)
    ).replace([np.inf, -np.inf], 0).fillna(0.0)

    # Rank within building-month (1 = lowest consumer), normalized to 0..1.
    df["building_rank"] = bm.rank(method="average", ascending=True)
    df["building_rank_norm"] = (
        (df["building_rank"] - 1) / (df["peer_count"] - 1).replace(0, np.nan)
    ).fillna(0.5)

    # Cross-check against same-profile peers in the same district/month.
    pm = df.groupby(["district", "profile", "year", "month"])["consumption_kwh"]
    profile_mean = pm.transform("mean")
    df["profile_peer_mean"] = profile_mean
    df["deviation_from_profile_avg"] = (
        (df["consumption_kwh"] - profile_mean) / profile_mean.replace(0, np.nan)
    ).replace([np.inf, -np.inf], 0).fillna(0.0)
    return df
