"""Columns the Isolation Forest trains on.

These are all engineered, scale-relative features (deviations, ratios, scores)
so the model never trains on raw consumption magnitude alone.
"""

FEATURE_COLUMNS = [
    "sudden_drop_score",
    "volatility_index",
    "persistence_low_usage_score",
    "trend_slope",
    "month_over_month_change",
    "seasonal_deviation_score",
    "seasonal_shortfall",
    "z_score_vs_peers",
    "deviation_from_building_avg",
    "deviation_from_profile_avg",
    "building_rank_norm",
    "hotspot_score",
    "shape_distance_score",
    "correlation_with_own_history",
    "correlation_with_peers",
]
