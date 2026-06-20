"""Trigger registry primitives.

Each trigger is a vectorized detector that scores every monthly record in
0..1. A trigger "fires" when its score crosses its fire threshold. The output
schema for a single fired trigger is exactly:

    {
      "trigger_name": "",
      "score": 0.0,
      "threshold": "",
      "evidence_window": "",
      "features_used": [],
      "reason": ""
    }
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import pandas as pd

GROUP_SELF_BEHAVIOR = "Self-Behavior"
GROUP_SEASONAL = "Seasonal"
GROUP_PEER = "Peer Comparison"
GROUP_GEOGRAPHIC = "Geographic"
GROUP_METER_INTEGRITY = "Meter Integrity"
GROUP_LOAD_SHAPE = "Load Shape"

GROUPS = [
    GROUP_SELF_BEHAVIOR,
    GROUP_SEASONAL,
    GROUP_PEER,
    GROUP_GEOGRAPHIC,
    GROUP_METER_INTEGRITY,
    GROUP_LOAD_SHAPE,
]


@dataclass(frozen=True)
class TriggerOutput:
    trigger_name: str
    group: str
    score: float
    threshold: str
    evidence_window: str
    features_used: list[str]
    reason: str

    def to_dict(self) -> dict:
        return {
            "trigger_name": self.trigger_name,
            "group": self.group,
            "score": round(float(self.score), 4),
            "threshold": self.threshold,
            "evidence_window": self.evidence_window,
            "features_used": self.features_used,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class TriggerSpec:
    name: str
    group: str
    threshold: str
    evidence_window: str
    features_used: list[str]
    fire_threshold: float
    # Vectorized scorer: takes the enriched frame, returns a 0..1 Series.
    score_fn: Callable[[pd.DataFrame], pd.Series]
    # Per-row reason builder (only called for fired rows).
    reason_fn: Callable[[pd.Series], str]


TRIGGER_REGISTRY: list[TriggerSpec] = []


def register(spec: TriggerSpec) -> TriggerSpec:
    TRIGGER_REGISTRY.append(spec)
    return spec


def evaluate_triggers(df: pd.DataFrame) -> pd.DataFrame:
    """Attach a `trig__<name>` score column for every registered trigger."""
    out = df.copy()
    for spec in TRIGGER_REGISTRY:
        score = spec.score_fn(out)
        out[f"trig__{spec.name}"] = (
            pd.Series(score, index=out.index)
            .replace([float("inf"), float("-inf")], 0)
            .fillna(0.0)
            .clip(0, 1)
        )
    return out


def build_trigger_outputs(row: pd.Series) -> list[dict]:
    """Build the structured list of fired triggers for a single row."""
    fired: list[dict] = []
    for spec in TRIGGER_REGISTRY:
        score = float(row.get(f"trig__{spec.name}", 0.0) or 0.0)
        if score >= spec.fire_threshold:
            fired.append(
                TriggerOutput(
                    trigger_name=spec.name,
                    group=spec.group,
                    score=score,
                    threshold=spec.threshold,
                    evidence_window=spec.evidence_window,
                    features_used=spec.features_used,
                    reason=spec.reason_fn(row),
                ).to_dict()
            )
    fired.sort(key=lambda t: t["score"], reverse=True)
    return fired
