"""Geographic features (district + building clustering of anomalies)."""

from __future__ import annotations

import pandas as pd


def add_geographic_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["district_mean_usage"] = df.groupby(["district", "year", "month"])[
        "consumption_kwh"
    ].transform("mean")

    # A member is "suspiciously low" if it sits well below its building peers.
    low_flag = (df["deviation_from_building_avg"] < -0.40).astype(float)
    df["building_anomaly_density"] = df.assign(_low=low_flag).groupby(
        ["building_id", "year", "month"]
    )["_low"].transform("mean")

    district_low = (df["deviation_from_profile_avg"] < -0.40).astype(float)
    district_density = df.assign(_dlow=district_low).groupby(
        ["district", "year", "month"]
    )["_dlow"].transform("mean")

    df["hotspot_score"] = (
        0.6 * df["building_anomaly_density"] + 0.4 * district_density
    ).clip(0, 1)
    return df
