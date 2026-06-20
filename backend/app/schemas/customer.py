from pydantic import BaseModel


class CustomerListItem(BaseModel):
    customer_id: str
    name: str = ""
    building_id: str
    district: str
    property_type: str
    latitude: float | None = None
    longitude: float | None = None
    fraud_type: str | None = None
    review_status: str = "open"
    risk_score: float | None = None
    confidence_score: float | None = None
    estimated_loss_eur: float | None = None
    status: str | None = None


class CustomerConsumptionPoint(BaseModel):
    year: int
    month: int
    season: str
    temperature: float
    consumption_kwh: float
    anomaly: int
    anomaly_type: str | None = None


class CustomerDetail(BaseModel):
    customer_id: str
    building_id: str
    district: str
    property_type: str
    occupants: int
    area_m2: float
    latitude: float
    longitude: float
    customer_profile: dict
    fraud_type: str | None = None
    risk_score: float | None = None
    confidence_score: float | None = None
    status: str | None = None
    groups_fired: int | None = None
    estimated_loss_eur: float | None = None
    reasons: list[str] = []
    comparisons: dict = {}
    triggers: list[dict] = []
    consumption_history: list[CustomerConsumptionPoint]
