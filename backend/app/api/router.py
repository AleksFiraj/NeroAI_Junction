from fastapi import APIRouter

from app.api.routes.ai import router as ai_router
from app.api.routes.analyze import router as analyze_router
from app.api.routes.customers import router as customers_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.data_entry import router as data_entry_router
from app.api.routes.dataset import router as dataset_router
from app.api.routes.explanation import router as explanation_router
from app.api.routes.geo import router as geo_router
from app.api.routes.risk import router as risk_router
from app.api.routes.train import router as train_router

api_router = APIRouter()
api_router.include_router(customers_router, tags=["customers"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(geo_router, tags=["geo"])
api_router.include_router(risk_router, tags=["risk"])
api_router.include_router(dataset_router, tags=["dataset"])
api_router.include_router(train_router, tags=["training"])
api_router.include_router(analyze_router, tags=["analysis"])
api_router.include_router(explanation_router, tags=["explanation"])
api_router.include_router(ai_router, tags=["ai"])
api_router.include_router(data_entry_router, tags=["data-entry"])
