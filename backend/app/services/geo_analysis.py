from __future__ import annotations

import numpy as np
import pandas as pd


def compute_geo_insights(scored_df: pd.DataFrame) -> dict[str, pd.DataFrame | list[dict]]:
    if scored_df.empty:
        return {
            "district": pd.DataFrame(),
            "building": pd.DataFrame(),
            "hotspots": [],
        }

    district = (
        scored_df.groupby("district")
        .agg(
            avg_consumption=("consumption_kwh", "mean"),
            avg_anomaly_score=("anomaly_score", "mean"),
            suspicious_ratio=("anomaly_score", lambda s: float((s > 0.65).mean())),
            latitude=("latitude", "mean"),
            longitude=("longitude", "mean"),
        )
        .reset_index()
    )
    district["geo_risk_score"] = (
        0.6 * district["avg_anomaly_score"] + 0.4 * district["suspicious_ratio"]
    ) * 100
    district["geo_risk_score"] = district["geo_risk_score"].clip(0, 100).round(2)

    building = (
        scored_df.groupby("building_id")
        .agg(
            district=("district", "first"),
            avg_anomaly_score=("anomaly_score", "mean"),
            suspicious_ratio=("anomaly_score", lambda s: float((s > 0.65).mean())),
            latitude=("latitude", "mean"),
            longitude=("longitude", "mean"),
        )
        .reset_index()
    )
    building["geo_risk_score"] = (
        0.7 * building["avg_anomaly_score"] + 0.3 * building["suspicious_ratio"]
    ) * 100
    building["geo_risk_score"] = building["geo_risk_score"].clip(0, 100).round(2)

    hotspot_threshold = float(np.percentile(building["geo_risk_score"], 85))
    hotspots = (
        building[building["geo_risk_score"] >= hotspot_threshold]
        .sort_values("geo_risk_score", ascending=False)
        .head(40)
        .to_dict(orient="records")
    )

    return {"district": district, "building": building, "hotspots": hotspots}


def add_geographic_anomaly(
    scored_df: pd.DataFrame,
    district_geo: pd.DataFrame,
    building_geo: pd.DataFrame,
) -> pd.DataFrame:
    if scored_df.empty:
        return scored_df

    district_map = district_geo.set_index("district")["geo_risk_score"].to_dict()
    building_map = building_geo.set_index("building_id")["geo_risk_score"].to_dict()

    df = scored_df.copy()
    df["district_geo_risk"] = df["district"].map(district_map).fillna(0.0) / 100.0
    df["building_geo_risk"] = df["building_id"].map(building_map).fillna(0.0) / 100.0
    df["geographic_anomaly"] = (0.55 * df["district_geo_risk"] + 0.45 * df["building_geo_risk"]).clip(0, 1)
    return df
