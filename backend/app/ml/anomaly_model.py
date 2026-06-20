"""Isolation Forest anomaly model.

Trained strictly on engineered, scale-relative features (never raw consumption
alone). Produces a normalized 0..1 anomaly score that the risk engine treats as
a corroborating signal, not a dominating one.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.features.feature_config import FEATURE_COLUMNS
from app.ml.model_store import save_model_artifact


def _feature_matrix(df: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    available = [c for c in FEATURE_COLUMNS if c in df.columns]
    matrix = df[available].replace([np.inf, -np.inf], 0).fillna(0).to_numpy()
    return matrix, available


def train_model(features_df: pd.DataFrame, random_seed: int = 42) -> dict:
    """Fit and persist the Isolation Forest. Returns training metadata."""
    if features_df.empty:
        return {"trained": False, "reason": "no data", "n_samples": 0}

    x, used = _feature_matrix(features_df)
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)

    model = IsolationForest(
        n_estimators=300,
        contamination=0.1,
        random_state=random_seed,
        n_jobs=-1,
    )
    model.fit(x_scaled)
    save_model_artifact({"model": model, "scaler": scaler, "features": used})

    return {
        "trained": True,
        "n_samples": int(len(features_df)),
        "n_features": len(used),
        "features": used,
    }


def _normalize_scores(raw: np.ndarray) -> np.ndarray:
    raw_min, raw_max = float(raw.min()), float(raw.max())
    denom = raw_max - raw_min if raw_max > raw_min else 1.0
    return np.clip((raw - raw_min) / denom, 0, 1)


def train_and_score(features_df: pd.DataFrame, random_seed: int = 42) -> pd.DataFrame:
    """Train the model and attach `anomaly_score` + `model_flag` columns."""
    if features_df.empty:
        return features_df

    df = features_df.copy()
    x, used = _feature_matrix(df)

    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)

    model = IsolationForest(
        n_estimators=300,
        contamination=0.1,
        random_state=random_seed,
        n_jobs=-1,
    )
    model.fit(x_scaled)

    raw = -model.decision_function(x_scaled)
    df["anomaly_score"] = _normalize_scores(raw).round(6)
    df["model_flag"] = (model.predict(x_scaled) == -1).astype(int)

    save_model_artifact({"model": model, "scaler": scaler, "features": used})
    return df


def reconstruction_error_score(features_df: pd.DataFrame) -> pd.Series:
    """Optional autoencoder-style reconstruction error hook.

    A lightweight PCA reconstruction stands in for a full autoencoder so the
    pipeline can blend reconstruction error without a heavy deep-learning
    dependency. Returns a 0..1 series aligned to the input frame.
    """
    if features_df.empty:
        return pd.Series(dtype=float)

    from sklearn.decomposition import PCA

    x, _ = _feature_matrix(features_df)
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)

    n_components = max(1, min(x_scaled.shape[1] - 1, 6))
    pca = PCA(n_components=n_components, random_state=0)
    reconstructed = pca.inverse_transform(pca.fit_transform(x_scaled))
    errors = np.mean((x_scaled - reconstructed) ** 2, axis=1)
    return pd.Series(_normalize_scores(errors), index=features_df.index).round(6)
