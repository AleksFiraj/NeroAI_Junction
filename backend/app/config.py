from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VoltGuard AI"
    app_env: str = "dev"
    api_prefix: str = ""
    sqlite_path: str = "data/voltguard.db"
    model_path: str = "models/isolation_forest.joblib"
    random_seed: int = 42
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    tariff_eur_per_kwh: float = 0.14
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file="backend/.env", env_file_encoding="utf-8")

    @property
    def sqlite_url(self) -> str:
        db_file = Path(self.sqlite_path)
        return f"sqlite:///{db_file.as_posix()}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
