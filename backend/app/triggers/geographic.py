"""Geographic triggers (district / neighborhood clustering)."""

from __future__ import annotations

import pandas as pd

from app.triggers.base import GROUP_GEOGRAPHIC, TriggerSpec, register


def _district_outlier_score(df: pd.DataFrame) -> pd.Series:
    return (-df["deviation_from_profile_avg"] / 0.6).clip(0, 1)


register(
    TriggerSpec(
        name="district_outlier_trigger",
        group=GROUP_GEOGRAPHIC,
        threshold="> 40% below same-profile connections in district",
        evidence_window="current month, district + profile cohort",
        features_used=["deviation_from_profile_avg", "profile_peer_mean"],
        fire_threshold=0.45,
        score_fn=_district_outlier_score,
        reason_fn=lambda r: (
            f"Usage is well below similar {r['profile']} connections in {r['district']}."
        ),
    )
)

register(
    TriggerSpec(
        name="hotspot_cluster_trigger",
        group=GROUP_GEOGRAPHIC,
        threshold="hotspot cluster intensity > 40%",
        evidence_window="building + district anomaly density",
        features_used=["hotspot_score", "building_anomaly_density"],
        fire_threshold=0.40,
        score_fn=lambda df: df["hotspot_score"],
        reason_fn=lambda r: (
            f"Located in an anomaly hotspot (cluster intensity "
            f"{r['hotspot_score'] * 100:.0f}%) in {r['district']}."
        ),
    )
)


def _neighborhood_divergence_score(df: pd.DataFrame) -> pd.Series:
    own_low = (-df["deviation_from_building_avg"] / 0.6).clip(0, 1)
    # Isolated divergence: this unit is low while the neighborhood is otherwise normal.
    neighborhood_normal = (1.0 - df["building_anomaly_density"]).clip(0, 1)
    return (own_low * neighborhood_normal).clip(0, 1)


register(
    TriggerSpec(
        name="neighborhood_divergence_trigger",
        group=GROUP_GEOGRAPHIC,
        threshold="strong individual deviation within an otherwise normal building",
        evidence_window="current month, building cohort",
        features_used=["deviation_from_building_avg", "building_anomaly_density"],
        fire_threshold=0.45,
        score_fn=_neighborhood_divergence_score,
        reason_fn=lambda r: (
            "Customer strongly diverges from an otherwise normal neighborhood in "
            f"{r['district']}."
        ),
    )
)
