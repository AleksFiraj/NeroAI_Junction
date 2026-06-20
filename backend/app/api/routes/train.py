from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.pipeline import train_only

router = APIRouter()


@router.post("/train-model")
def train_model_endpoint(db: Session = Depends(get_db)) -> dict:
    result = train_only(db)
    return {"message": "Isolation Forest training complete", **result}
