from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64), default="")
    building_id: Mapped[str] = mapped_column(String(32), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    property_type: Mapped[str] = mapped_column(String(32))
    occupants: Mapped[int] = mapped_column(Integer)
    area_m2: Mapped[float] = mapped_column(Float)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    customer_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    fraud_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    review_status: Mapped[str] = mapped_column(String(16), default="open", index=True)

    consumptions: Mapped[list["Consumption"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    risks: Mapped[list["RiskAssessment"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )


class Consumption(Base):
    __tablename__ = "consumption"
    __table_args__ = (
        UniqueConstraint("customer_id", "year", "month", name="uq_consumption_customer_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("customers.customer_id"), index=True
    )
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    season: Mapped[str] = mapped_column(String(16), index=True)
    temperature: Mapped[float] = mapped_column(Float)
    holiday_month: Mapped[bool] = mapped_column(Boolean, default=False)
    consumption_kwh: Mapped[float] = mapped_column(Float)
    anomaly: Mapped[int] = mapped_column(Integer, default=0)
    anomaly_type: Mapped[str | None] = mapped_column(String(64), nullable=True)

    customer: Mapped[Customer] = relationship(back_populates="consumptions")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    __table_args__ = (
        UniqueConstraint("customer_id", "year", "month", name="uq_risk_customer_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("customers.customer_id"), index=True
    )
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    personal_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    seasonal_deviation: Mapped[float] = mapped_column(Float, default=0.0)
    peer_deviation: Mapped[float] = mapped_column(Float, default=0.0)
    geographic_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16), default="Normal", index=True)
    groups_fired: Mapped[int] = mapped_column(Integer, default=0)
    reasons_json: Mapped[str] = mapped_column(Text, default="[]")
    comparisons_json: Mapped[str] = mapped_column(Text, default="{}")
    triggers_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    customer: Mapped[Customer] = relationship(back_populates="risks")


class CustomerRiskSummary(Base):
    """Customer-level risk view derived from the monthly assessments.

    The score is the mean of the top-3 risk months over the last 12 months
    (sustained anomaly), while the trigger evidence comes from the single
    highest-risk month (the representative period).
    """

    __tablename__ = "customer_risk_summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("customers.customer_id"), unique=True, index=True
    )
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    personal_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    seasonal_deviation: Mapped[float] = mapped_column(Float, default=0.0)
    peer_deviation: Mapped[float] = mapped_column(Float, default=0.0)
    geographic_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16), default="Normal", index=True)
    groups_fired: Mapped[int] = mapped_column(Integer, default=0)
    estimated_loss_eur: Mapped[float] = mapped_column(Float, default=0.0)
    reasons_json: Mapped[str] = mapped_column(Text, default="[]")
    comparisons_json: Mapped[str] = mapped_column(Text, default="{}")
    triggers_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InspectorAction(Base):
    __tablename__ = "inspector_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(32), index=True)
    action_type: Mapped[str] = mapped_column(String(32), default="note")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
