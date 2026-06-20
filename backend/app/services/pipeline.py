"""End-to-end analysis orchestration.

load -> engineer features -> Isolation Forest score -> trigger registry ->
risk engine -> deterministic explanations -> persist.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import pandas as pd
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import CustomerRiskSummary, RiskAssessment
from app.explainability.deterministic import attach_explanations
from app.features.engineer import engineer_features
from app.features.loader import load_consumption_frame
from app.ml.anomaly_model import train_and_score
from app.risk_engine.engine import (
    CRITICAL_THRESHOLD,
    SUSPICIOUS_THRESHOLD,
    apply_risk_engine,
)
from app.services.geo_analysis import compute_geo_insights
from app.triggers import evaluate_triggers

RECENT_WINDOW_MONTHS = 12
TOP_N_MONTHS = 3


@dataclass
class AnalysisResult:
    records_analyzed: int
    latest_customers_scored: int
    critical_customers: int
    suspicious_customers: int
    district_geo: list[dict]
    hotspots: list[dict]


def _persist_risk_assessments(db: Session, df: pd.DataFrame) -> None:
    db.query(RiskAssessment).delete()
    db.commit()

    rows = [
        RiskAssessment(
            customer_id=row.customer_id,
            year=int(row.year),
            month=int(row.month),
            anomaly_score=float(row.anomaly_score),
            personal_anomaly=float(row.personal_anomaly),
            seasonal_deviation=float(row.seasonal_deviation),
            peer_deviation=float(row.peer_deviation),
            geographic_anomaly=float(row.geographic_anomaly),
            risk_score=float(row.risk_score),
            confidence_score=float(row.confidence_score),
            status=row.status,
            groups_fired=int(row.groups_fired),
            reasons_json=row.reasons_json,
            comparisons_json=row.comparisons_json,
            triggers_json=row.triggers_json,
        )
        for row in df.itertuples(index=False)
    ]
    db.add_all(rows)
    db.commit()


def _status_for(risk_score: float) -> str:
    if risk_score >= CRITICAL_THRESHOLD:
        return "Critical"
    if risk_score >= SUSPICIOUS_THRESHOLD:
        return "Suspicious"
    return "Normal"


def _build_customer_summaries(df: pd.DataFrame) -> pd.DataFrame:
    """Customer-level risk = mean of top-3 risk months over the last 12 months.

    The representative (highest-risk) month supplies the trigger evidence, and
    estimated loss is the unbilled energy (expected - actual) over flagged
    recent months, valued at the configured tariff.
    """
    tariff = get_settings().tariff_eur_per_kwh
    df = df.sort_values(["customer_id", "year", "month"])
    summaries: list[dict] = []
    for customer_id, group in df.groupby("customer_id"):
        recent = group.tail(RECENT_WINDOW_MONTHS)
        summary_risk = round(float(recent["risk_score"].nlargest(TOP_N_MONTHS).mean()), 2)
        rep = recent.loc[recent["risk_score"].idxmax()]

        flagged = recent[recent["risk_score"] >= SUSPICIOUS_THRESHOLD]
        shortfall = (flagged["expected_usage_by_month"] - flagged["consumption_kwh"]).clip(
            lower=0
        )
        estimated_loss = round(float(shortfall.sum()) * tariff, 2)

        summaries.append(
            {
                "customer_id": customer_id,
                "year": int(rep["year"]),
                "month": int(rep["month"]),
                "anomaly_score": float(rep["anomaly_score"]),
                "personal_anomaly": float(rep["personal_anomaly"]),
                "seasonal_deviation": float(rep["seasonal_deviation"]),
                "peer_deviation": float(rep["peer_deviation"]),
                "geographic_anomaly": float(rep["geographic_anomaly"]),
                "risk_score": summary_risk,
                "confidence_score": float(rep["confidence_score"]),
                "status": _status_for(summary_risk),
                "groups_fired": int(rep["groups_fired"]),
                "estimated_loss_eur": estimated_loss,
                "reasons_json": rep["reasons_json"],
                "comparisons_json": rep["comparisons_json"],
                "triggers_json": rep["triggers_json"],
            }
        )
    return pd.DataFrame(summaries)


def _persist_customer_summaries(db: Session, summary_df: pd.DataFrame) -> None:
    db.query(CustomerRiskSummary).delete()
    db.commit()
    if summary_df.empty:
        return
    rows = [
        CustomerRiskSummary(**record)
        for record in summary_df.to_dict(orient="records")
    ]
    db.add_all(rows)
    db.commit()


def run_full_analysis(db: Session) -> AnalysisResult:
    settings = get_settings()
    base_df = load_consumption_frame(db)
    if base_df.empty:
        return AnalysisResult(0, 0, 0, 0, [], [])

    features_df = engineer_features(base_df)
    scored_df = train_and_score(features_df, random_seed=settings.random_seed)

    # Geographic context for the analysis summary (heatmap recomputes from DB).
    geo = compute_geo_insights(scored_df)
    district_geo_df = geo["district"] if isinstance(geo["district"], pd.DataFrame) else pd.DataFrame()

    trig_df = evaluate_triggers(scored_df)
    risk_df = apply_risk_engine(trig_df)
    explained_df = attach_explanations(risk_df)
    _persist_risk_assessments(db, explained_df)

    summary_df = _build_customer_summaries(explained_df)
    _persist_customer_summaries(db, summary_df)

    return AnalysisResult(
        records_analyzed=len(explained_df),
        latest_customers_scored=len(summary_df),
        critical_customers=int((summary_df["status"] == "Critical").sum()),
        suspicious_customers=int((summary_df["status"] == "Suspicious").sum()),
        district_geo=json.loads(district_geo_df.to_json(orient="records"))
        if not district_geo_df.empty
        else [],
        hotspots=geo["hotspots"] if isinstance(geo["hotspots"], list) else [],
    )


def ensure_seeded(db: Session) -> dict:
    """Generate the dataset and run analysis exactly once (if empty).

    The dataset is generated a single time; afterwards the app keeps using the
    persisted data and only re-analyzes when new readings are added.
    """
    from app.dataset.generator import DatasetConfig, replace_dataset_in_db
    from app.db.models import Customer

    if db.query(Customer.id).first() is not None:
        return {"seeded": False}

    settings = get_settings()
    metrics = replace_dataset_in_db(db, DatasetConfig(seed=settings.random_seed))
    run_full_analysis(db)
    return {"seeded": True, **metrics}


def train_only(db: Session) -> dict:
    """Train the Isolation Forest from the current dataset without persisting risk."""
    from app.ml.anomaly_model import train_model

    base_df = load_consumption_frame(db)
    if base_df.empty:
        return {"trained": False, "reason": "no dataset; generate data first", "n_samples": 0}
    features_df = engineer_features(base_df)
    return train_model(features_df, random_seed=get_settings().random_seed)
