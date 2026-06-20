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
    return df.sort_values(["customer_id", "date"]).reset_index(drop=True)
