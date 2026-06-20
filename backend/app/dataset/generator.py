"""Synthetic dataset generation for Tirana households and businesses.

Produces realistic 24-month consumption series for ~1000 customers spread
across Tirana districts, driven by behavioral archetypes and the canonical
Tirana monthly temperature profile. Fraud is injected afterwards.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.config import get_settings
from app.dataset.fraud_injection import inject_fraud
from app.db.models import Consumption, Customer, InspectorAction, RiskAssessment
from app.utils.profiles import PROFILE_POPULATION_WEIGHTS, PROFILES, Profile
from app.utils.tirana import (
    DISTRICTS,
    is_holiday_month,
    month_to_season,
    temperature_for_month,
    winter_factor,
)


@dataclass(frozen=True)
class DatasetConfig:
    num_customers: int = 1000
    months_history: int = 24
    seed: int = 42


_FIRST_NAMES = [
    "Arben", "Besnik", "Dritan", "Endrit", "Gentian", "Ilir", "Klodian", "Lulzim",
    "Petrit", "Sokol", "Aurel", "Bujar", "Edmond", "Fatos", "Genc", "Kreshnik",
    "Albana", "Besa", "Drita", "Elona", "Fatmira", "Jeta", "Mirela", "Suela",
    "Teuta", "Vera", "Ardita", "Blerta", "Edona", "Migena", "Rudina", "Valbona",
]
_LAST_NAMES = [
    "Hoxha", "Shehu", "Kraja", "Berisha", "Dervishi", "Gjoka", "Hysa", "Kola",
    "Leka", "Marku", "Nuhiu", "Prifti", "Rama", "Shkodra", "Tafa", "Vata",
    "Bardhi", "Cela", "Doci", "Frasheri", "Gega", "Lala", "Meta", "Zeqiri",
]


def _generate_name(rng: np.random.Generator) -> str:
    first = _FIRST_NAMES[int(rng.integers(0, len(_FIRST_NAMES)))]
    last = _LAST_NAMES[int(rng.integers(0, len(_LAST_NAMES)))]
    return f"{first} {last}"


def _district_slug(district: str) -> str:
    return "".join(ch for ch in district.upper() if ch.isalpha())[:4]


def _pick_profile(rng: np.random.Generator) -> Profile:
    names = list(PROFILE_POPULATION_WEIGHTS.keys())
    weights = np.array([PROFILE_POPULATION_WEIGHTS[n] for n in names], dtype=float)
    weights /= weights.sum()
    chosen = names[int(rng.choice(len(names), p=weights))]
    return PROFILES[chosen]


def _pick_district(profile: Profile, rng: np.random.Generator) -> str:
    districts = list(profile.district_weights.keys())
    weights = np.array(list(profile.district_weights.values()), dtype=float)
    weights /= weights.sum()
    return districts[int(rng.choice(len(districts), p=weights))]


def _build_customers(cfg: DatasetConfig, rng: np.random.Generator) -> pd.DataFrame:
    records: list[dict] = []
    for idx in range(cfg.num_customers):
        profile = _pick_profile(rng)
        district = _pick_district(profile, rng)
        geo = DISTRICTS[district]

        occupants = int(rng.integers(profile.occupants_min, profile.occupants_max + 1))
        area_m2 = float(np.round(rng.uniform(*profile.area_m2), 2))
        lat = geo["lat"] + float(rng.normal(0, geo["jitter"]))
        lon = geo["lon"] + float(rng.normal(0, geo["jitter"]))

        winter_target = float(rng.uniform(*profile.winter_kwh))
        summer_target = float(rng.uniform(*profile.summer_kwh))

        records.append(
            {
                "customer_id": f"CUST-{idx + 1:05d}",
                "name": _generate_name(rng),
                "district": district,
                "property_type": profile.property_type,
                "occupants": occupants,
                "area_m2": area_m2,
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "profile_name": profile.name,
                "winter_target": winter_target,
                "summer_target": summer_target,
                "efficiency": float(rng.uniform(0.9, 1.1)),
            }
        )

    customers = pd.DataFrame(records)
    customers = _assign_buildings(customers, rng)

    customers["customer_profile"] = customers.apply(
        lambda r: {
            "archetype": r["profile_name"],
            "winter_band_kwh": list(PROFILES[r["profile_name"]].winter_kwh),
            "summer_band_kwh": list(PROFILES[r["profile_name"]].summer_kwh),
            "expected_winter_kwh": round(r["winter_target"], 1),
            "expected_summer_kwh": round(r["summer_target"], 1),
        },
        axis=1,
    )
    customers["fraud_type"] = None
    return customers


def _assign_buildings(customers: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Group customers into shared buildings of similar households.

    Buildings are formed within (district, archetype) cohorts so peers share a
    district and a behavioral profile, mirroring how similar households cluster
    in the same building/block. This keeps peer/neighborhood comparison clean.
    Building size varies between 3 and 8 units.
    """
    building_ids = pd.Series(index=customers.index, dtype=object)
    counter = 0
    for (district, profile_name), group in customers.groupby(["district", "profile_name"]):
        idx = list(group.index)
        rng.shuffle(idx)
        slug = _district_slug(district)
        pos = 0
        while pos < len(idx):
            counter += 1
            size = int(rng.integers(3, 9))
            chunk = idx[pos : pos + size]
            bid = f"BLD-{slug}-{counter:04d}"
            for i in chunk:
                building_ids.at[i] = bid
            pos += size
    customers["building_id"] = building_ids
    return customers


def _build_consumption(
    customers_df: pd.DataFrame, cfg: DatasetConfig, rng: np.random.Generator
) -> pd.DataFrame:
    month_index = pd.date_range(end=datetime.utcnow(), periods=cfg.months_history, freq="MS")
    records: list[dict] = []

    for customer in customers_df.itertuples(index=False):
        is_business = customer.property_type == "Business"
        for dt in month_index:
            month = int(dt.month)
            season = month_to_season(month)
            base_temp = temperature_for_month(month)
            temp = round(base_temp + float(rng.normal(0, 1.2)), 2)
            holiday = is_holiday_month(month)

            wf = winter_factor(base_temp)
            base = customer.summer_target + (customer.winter_target - customer.summer_target) * wf
            base *= customer.efficiency

            if holiday:
                if is_business:
                    holiday_factor = 0.80 if month == 8 else 1.0
                else:
                    holiday_factor = 0.87 if month == 8 else 1.06
                base *= holiday_factor

            noise = rng.normal(0, base * 0.05)
            kwh = max(10.0, base + noise)

            records.append(
                {
                    "customer_id": customer.customer_id,
                    "building_id": customer.building_id,
                    "district": customer.district,
                    "property_type": customer.property_type,
                    "year": int(dt.year),
                    "month": month,
                    "season": season,
                    "temperature": temp,
                    "holiday_month": holiday,
                    "consumption_kwh": round(kwh, 2),
                    "anomaly": 0,
                    "anomaly_type": None,
                }
            )
    return pd.DataFrame(records)


def generate_dataset_frames(
    config: DatasetConfig | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    cfg = config or DatasetConfig(seed=get_settings().random_seed)
    rng = np.random.default_rng(cfg.seed)
    customers_df = _build_customers(cfg, rng)
    consumption_df = _build_consumption(customers_df, cfg, rng)
    customers_df, consumption_df = inject_fraud(customers_df, consumption_df, rng)
    return customers_df, consumption_df


def replace_dataset_in_db(
    db: Session,
    config: DatasetConfig | None = None,
) -> dict[str, int]:
    customers_df, consumption_df = generate_dataset_frames(config)

    db.query(RiskAssessment).delete()
    db.query(InspectorAction).delete()
    db.query(Consumption).delete()
    db.query(Customer).delete()
    db.commit()

    customer_rows = [
        Customer(
            customer_id=row.customer_id,
            name=row.name,
            building_id=row.building_id,
            district=row.district,
            property_type=row.property_type,
            occupants=int(row.occupants),
            area_m2=float(row.area_m2),
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            customer_profile=row.customer_profile,
            fraud_type=row.fraud_type,
        )
        for row in customers_df.itertuples(index=False)
    ]
    db.add_all(customer_rows)
    db.commit()

    consumption_rows = [
        Consumption(
            customer_id=row.customer_id,
            year=int(row.year),
            month=int(row.month),
            season=row.season,
            temperature=float(row.temperature),
            holiday_month=bool(row.holiday_month),
            consumption_kwh=float(row.consumption_kwh),
            anomaly=int(row.anomaly),
            anomaly_type=row.anomaly_type,
        )
        for row in consumption_df.itertuples(index=False)
    ]
    db.add_all(consumption_rows)
    db.commit()

    return {
        "customers": len(customers_df),
        "consumption_records": len(consumption_df),
        "fraud_customers": int(customers_df["fraud_type"].notna().sum()),
        "anomaly_records": int(consumption_df["anomaly"].sum()),
    }
