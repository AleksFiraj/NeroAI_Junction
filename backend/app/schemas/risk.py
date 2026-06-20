from pydantic import BaseModel


class RiskResponse(BaseModel):
    customer_id: str
    year: int
    month: int
    anomaly_score: float
    personal_anomaly: float
    seasonal_deviation: float
    peer_deviation: float
    geographic_anomaly: float
    risk_score: float
    confidence_score: float
    status: str
    groups_fired: int = 0
    estimated_loss_eur: float = 0.0
    reasons: list[str]
    comparisons: dict
    triggers: list[dict] = []
