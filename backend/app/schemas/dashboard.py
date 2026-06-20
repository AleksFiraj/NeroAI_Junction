from pydantic import BaseModel

from app.schemas.customer import CustomerListItem


class KpiCard(BaseModel):
    label: str
    value: float
    unit: str | None = None


class DashboardResponse(BaseModel):
    kpis: list[KpiCard]
    risk_distribution: dict[str, int]
    top_risky_customers: list[CustomerListItem]
    district_risk: list[dict]
    anomalies_over_time: list[dict]
