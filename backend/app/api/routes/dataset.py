from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dataset.generator import DatasetConfig, replace_dataset_in_db
from app.db.session import get_db
from app.schemas.explanation import GenerateDatasetRequest

router = APIRouter()


@router.post("/generate-dataset")
def generate_dataset(payload: GenerateDatasetRequest, db: Session = Depends(get_db)) -> dict:
    metrics = replace_dataset_in_db(
        db,
        DatasetConfig(
            num_customers=payload.num_customers,
            months_history=payload.months_history,
            seed=payload.seed,
        ),
    )
    return {"message": "Synthetic dataset generated", **metrics}
