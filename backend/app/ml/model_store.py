from pathlib import Path

import joblib

from app.config import get_settings


def save_model_artifact(artifact: dict) -> None:
    settings = get_settings()
    model_path = Path(settings.model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_path)


def load_model_artifact() -> dict | None:
    settings = get_settings()
    model_path = Path(settings.model_path)
    if not model_path.exists():
        return None
    return joblib.load(model_path)
