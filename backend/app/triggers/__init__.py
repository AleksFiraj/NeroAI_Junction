"""Trigger Registry System.

Importing this package registers every trigger across the six groups and
exposes the evaluation entry points used by the risk engine.
"""

from app.triggers import (  # noqa: F401  (import for side-effect registration)
    geographic,
    load_shape,
    meter_integrity,
    peer,
    seasonal,
    self_behavior,
)
from app.triggers.base import (
    GROUPS,
    GROUP_GEOGRAPHIC,
    GROUP_LOAD_SHAPE,
    GROUP_METER_INTEGRITY,
    GROUP_PEER,
    GROUP_SEASONAL,
    GROUP_SELF_BEHAVIOR,
    TRIGGER_REGISTRY,
    TriggerOutput,
    build_trigger_outputs,
    evaluate_triggers,
)

__all__ = [
    "GROUPS",
    "GROUP_GEOGRAPHIC",
    "GROUP_LOAD_SHAPE",
    "GROUP_METER_INTEGRITY",
    "GROUP_PEER",
    "GROUP_SEASONAL",
    "GROUP_SELF_BEHAVIOR",
    "TRIGGER_REGISTRY",
    "TriggerOutput",
    "build_trigger_outputs",
    "evaluate_triggers",
]
