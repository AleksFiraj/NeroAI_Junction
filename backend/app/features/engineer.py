"""Feature engineering orchestrator.

Runs the personal, seasonal, peer, geographic and load-shape feature builders
in dependency order and returns a single enriched frame.
"""

from __future__ import annotations

import pandas as pd

from app.features.geographic import add_geographic_features
from app.features.peer import add_peer_features
from app.features.personal import add_personal_features
from app.features.seasonal import add_seasonal_features
from app.features.shape import add_shape_features


def engineer_features(consumption_df: pd.DataFrame) -> pd.DataFrame:
    if consumption_df.empty:
        return consumption_df

    df = consumption_df.copy()
    df = add_personal_features(df)
    df = add_seasonal_features(df)
    df = add_peer_features(df)
    df = add_geographic_features(df)
    df = add_shape_features(df)
    df = _add_expected_baseline(df)
    return df.sort_values(["customer_id", "date"]).reset_index(drop=True)


def _add_expected_baseline(df: pd.DataFrame) -> pd.DataFrame:
    """Expected consumption used purely for the financial loss calculation.

    This is a peer-anchored baseline so a customer whose own readings are
    depressed (e.g. tampering) is still compared against the normal level of
    similar connections, rather than against their own suppressed history.

    Priority:
      1. Peer baseline (building average, then same district+profile average)
      2. Personal baseline (own typical level for this calendar month)
    Final = weighted_average(peer, personal), peer-weighted.
    """
    df = df.copy()

    # Peer baseline: prefer the building-month average, fall back to the
    # district+profile-month average when the building peer group is too thin.
    peer = df.get("peer_mean")
    profile_peer = df.get("profile_peer_mean")
    personal = df.get("expected_usage_by_month")

    if peer is None:
        peer = df["consumption_kwh"]
    if profile_peer is None:
        profile_peer = peer
    if personal is None:
        personal = df["consumption_kwh"]

    # A building peer group of <2 other connections is not a reliable anchor.
    peer_count = df.get("peer_count")
    if peer_count is not None:
        peer_baseline = peer.where(peer_count >= 3, profile_peer)
    else:
        peer_baseline = peer
    peer_baseline = peer_baseline.fillna(profile_peer).fillna(personal)
    personal = personal.fillna(peer_baseline)

    # Peer-weighted blend (peer is the primary signal for loss).
    df["expected_kwh_baseline"] = (0.6 * peer_baseline + 0.4 * personal).clip(lower=0.0)
    return df
