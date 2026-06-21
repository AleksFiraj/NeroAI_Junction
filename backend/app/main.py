from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.services.pipeline import ensure_seeded

settings = get_settings()
app = FastAPI(title=settings.app_name)

if settings.app_env == "dev":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def startup_event() -> None:
    Path("models").mkdir(exist_ok=True)
    Path("data").mkdir(exist_ok=True)
    init_db()
    db = SessionLocal()
    try:
        ensure_seeded(db)
    finally:
        db.close()


@app.get("/")
def healthcheck() -> dict:
    return {"service": "Nero AI", "status": "ok"}


app.include_router(api_router, prefix=settings.api_prefix)
