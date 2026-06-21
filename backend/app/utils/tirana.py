"""Tirana, Albania geographic and climate constants.

All synthetic data in Nero AI is anchored to the city of Tirana. This module
is the single source of truth for districts, their approximate coordinates, the
realistic monthly temperature profile, and season/holiday helpers.
"""

from __future__ import annotations

# Approximate geographic center of Tirana (lat, lon).
TIRANA_CENTER: tuple[float, float] = (41.3275, 19.8187)


# District centroids inside the Tirana region. Coordinates are approximate but
# realistic so that customers cluster geographically per district on the map.
# `jitter` controls the lat/lon spread of customers placed in that district.
DISTRICTS: dict[str, dict[str, float]] = {
    "Tiranë Center": {"lat": 41.3275, "lon": 19.8187, "jitter": 0.006},
    "Blloku": {"lat": 41.3200, "lon": 19.8170, "jitter": 0.004},
    "Laprakë": {"lat": 41.3380, "lon": 19.8050, "jitter": 0.007},
    "Kombinat": {"lat": 41.3300, "lon": 19.7750, "jitter": 0.008},
    "Kinostudio": {"lat": 41.3420, "lon": 19.8430, "jitter": 0.007},
    "Yzberisht": {"lat": 41.3150, "lon": 19.7700, "jitter": 0.008},
    "Fresku": {"lat": 41.3550, "lon": 19.8000, "jitter": 0.009},
    "Astir": {"lat": 41.3170, "lon": 19.7850, "jitter": 0.007},
    "Ali Demi": {"lat": 41.3250, "lon": 19.8450, "jitter": 0.006},
    "Sauk": {"lat": 41.2950, "lon": 19.8350, "jitter": 0.010},
}

DISTRICT_NAMES: list[str] = list(DISTRICTS.keys())


# Mandatory Tirana monthly temperatures (degrees Celsius) used both for dataset
# generation and for temperature-mismatch detection.
MONTHLY_TEMPERATURE: dict[int, float] = {
    1: 5.0,
    2: 7.0,
    3: 11.0,
    4: 15.0,
    5: 20.0,
    6: 25.0,
    7: 28.0,
    8: 28.0,
    9: 23.0,
    10: 18.0,
    11: 12.0,
    12: 7.0,
}

# Coldest / warmest reference temperatures, used to interpolate consumption
# between a customer's winter and summer behavior bands.
COLDEST_TEMP: float = min(MONTHLY_TEMPERATURE.values())
WARMEST_TEMP: float = max(MONTHLY_TEMPERATURE.values())

# Months treated as holiday-heavy in Albania (August vacations, December festive).
HOLIDAY_MONTHS: set[int] = {8, 12}

WINTER_MONTHS: set[int] = {12, 1, 2}
SUMMER_MONTHS: set[int] = {6, 7, 8}


def month_to_season(month: int) -> str:
    """Return the meteorological season label for a calendar month."""
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"


def temperature_for_month(month: int) -> float:
    """Return the canonical Tirana temperature for a calendar month."""
    return MONTHLY_TEMPERATURE[month]


def is_holiday_month(month: int) -> bool:
    return month in HOLIDAY_MONTHS


def winter_factor(temp: float) -> float:
    """Map a temperature to a 0..1 "coldness" factor.

    1.0 at the coldest Tirana month, 0.0 at the warmest. Used to blend a
    customer's winter and summer consumption bands across the year.
    """
    span = WARMEST_TEMP - COLDEST_TEMP
    if span <= 0:
        return 0.5
    raw = (WARMEST_TEMP - temp) / span
    return max(0.0, min(1.0, raw))
