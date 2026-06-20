"""Deterministic explainability.

Turns the fired triggers for each record into structured trigger payloads,
human-readable reasons, and a compact comparisons block. Reasons come straight
from the triggers, so explanations always match the detectors exactly.
"""

from __future__ import annotations

import json

import pandas as pd

from app.triggers.base import build_trigger_outputs


def _comparisons(row: pd.Series) -> dict:
    return {
        "deviation_from_building_avg": round(float(row.get("deviation_from_building_avg", 0) or 0), 4),
        "z_score_vs_peers": round(float(row.get("z_score_vs_peers", 0) or 0), 4),
        "seasonal_shortfall": round(float(row.get("seasonal_shortfall", 0) or 0), 4),
        "seasonal_ratio": round(float(row.get("seasonal_ratio", 0) or 0), 4),
        "sudden_drop_score": round(float(row.get("sudden_drop_score", 0) or 0), 4),
        "hotspot_score": round(float(row.get("hotspot_score", 0) or 0), 4),
        "anomaly_score": round(float(row.get("anomaly_score", 0) or 0), 4),
        "groups_fired": int(row.get("groups_fired", 0) or 0),
    }


def attach_explanations(risk_df: pd.DataFrame) -> pd.DataFrame:
    if risk_df.empty:
        return risk_df

    df = risk_df.copy()
    reasons_payload: list[str] = []
    comparisons_payload: list[str] = []
    triggers_payload: list[str] = []

    for _, row in df.iterrows():
        triggers = build_trigger_outputs(row)
        reasons = [t["reason"] for t in triggers]
        if not reasons:
            reasons = [
                "No fraud-indicating triggers fired; consumption is consistent with "
                "the customer's history, peers, and season."
            ]
        reasons_payload.append(json.dumps(reasons[:6]))
        triggers_payload.append(json.dumps(triggers))
        comparisons_payload.append(json.dumps(_comparisons(row)))

    df["reasons_json"] = reasons_payload
    df["comparisons_json"] = comparisons_payload
    df["triggers_json"] = triggers_payload
    return df
