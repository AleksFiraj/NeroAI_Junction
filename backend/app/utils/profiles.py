"""Tirana customer behavior archetypes.

Each archetype describes a realistic consumption persona: occupant range,
winter/summer monthly kWh bands, the property type it maps to, and which
Tirana districts it tends to live in.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Profile:
    name: str
    property_type: str
    occupants_min: int
    occupants_max: int
    winter_kwh: tuple[float, float]
    summer_kwh: tuple[float, float]
    area_m2: tuple[float, float]
    # District -> relative weight (likelihood this archetype lives there).
    district_weights: dict[str, float] = field(default_factory=dict)


PROFILES: dict[str, Profile] = {
    "Young Family": Profile(
        name="Young Family",
        property_type="Apartment",
        occupants_min=3,
        occupants_max=5,
        winter_kwh=(450.0, 650.0),
        summer_kwh=(300.0, 450.0),
        area_m2=(70.0, 130.0),
        district_weights={
            "Astir": 3.0,
            "Yzberisht": 3.0,
            "Laprakë": 1.5,
            "Fresku": 1.5,
            "Kombinat": 1.2,
            "Kinostudio": 1.0,
        },
    ),
    "Single Professional": Profile(
        name="Single Professional",
        property_type="Apartment",
        occupants_min=1,
        occupants_max=1,
        winter_kwh=(200.0, 350.0),
        summer_kwh=(180.0, 250.0),
        area_m2=(40.0, 75.0),
        district_weights={
            "Blloku": 3.0,
            "Tiranë Center": 3.0,
            "Kinostudio": 1.2,
            "Ali Demi": 1.0,
        },
    ),
    "Retired Couple": Profile(
        name="Retired Couple",
        property_type="House",
        occupants_min=2,
        occupants_max=2,
        winter_kwh=(500.0, 700.0),
        summer_kwh=(300.0, 500.0),
        area_m2=(80.0, 160.0),
        district_weights={
            "Laprakë": 2.5,
            "Kombinat": 2.5,
            "Kinostudio": 2.0,
            "Ali Demi": 2.0,
            "Sauk": 2.0,
            "Fresku": 1.5,
        },
    ),
    "Small Business": Profile(
        name="Small Business",
        property_type="Business",
        occupants_min=1,
        occupants_max=4,
        winter_kwh=(700.0, 1200.0),
        summer_kwh=(700.0, 1200.0),
        area_m2=(50.0, 220.0),
        district_weights={
            "Blloku": 3.0,
            "Tiranë Center": 3.0,
            "Laprakë": 1.2,
            "Ali Demi": 1.0,
        },
    ),
}

PROFILE_NAMES: list[str] = list(PROFILES.keys())

# Relative share of the customer base for each archetype.
PROFILE_POPULATION_WEIGHTS: dict[str, float] = {
    "Young Family": 0.38,
    "Single Professional": 0.27,
    "Retired Couple": 0.23,
    "Small Business": 0.12,
}
