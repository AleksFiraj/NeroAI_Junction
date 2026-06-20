from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.explanation import AnalyzeResponse
from app.services.pipeline import run_full_analysis

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(db: Session = Depends(get_db)) -> AnalyzeResponse:
    result = run_full_analysis(db)
    return AnalyzeResponse(
        records_analyzed=result.records_analyzed,
        latest_customers_scored=result.latest_customers_scored,
        critical_customers=result.critical_customers,
        suspicious_customers=result.suspicious_customers,
    )
