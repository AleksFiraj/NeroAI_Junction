from pydantic import BaseModel, Field


class GenerateDatasetRequest(BaseModel):
    num_customers: int = Field(default=1000, ge=100, le=5000)
    months_history: int = Field(default=24, ge=6, le=60)
    seed: int = 42


class AnalyzeResponse(BaseModel):
    records_analyzed: int
    latest_customers_scored: int
    critical_customers: int
    suspicious_customers: int


class AIExplanationRequest(BaseModel):
    customer_id: str
    reasons: list[str]
    risk_score: float
    status: str


class AIExplanationResponse(BaseModel):
    mode: str
    summary: str
