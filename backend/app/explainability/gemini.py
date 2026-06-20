"""Gemini-grounded investigation assistant.

The LLM is used ONLY to narrate / answer questions about the VoltGuard analysis
data. A strict factual context is built from the database and the model is
instructed to never invent facts. Without a GEMINI_API_KEY the module returns
deterministic, data-grounded answers from the same context.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Consumption, Customer, CustomerRiskSummary

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_INSTRUCTION = (
    "You are VoltGuard's electricity-fraud investigation assistant for Tirana, "
    "Albania. Answer ONLY using the VoltGuard analysis data provided in the "
    "context. Never invent numbers, names, customers, or findings. If the answer "
    "is not in the data, say you do not have that information. Be concise, "
    "professional, and specific. Do not claim certainty of fraud; describe "
    "evidence, risk, and confidence."
)


def build_customer_context(db: Session, customer_id: str) -> dict[str, Any] | None:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        return None

    summary = (
        db.query(CustomerRiskSummary)
        .filter(CustomerRiskSummary.customer_id == customer_id)
        .first()
    )
    history = (
        db.query(Consumption)
        .filter(Consumption.customer_id == customer_id)
        .order_by(Consumption.year.desc(), Consumption.month.desc())
        .limit(12)
        .all()
    )
    history = list(reversed(history))

    profile = customer.customer_profile if isinstance(customer.customer_profile, dict) else {}
    ctx: dict[str, Any] = {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "district": customer.district,
        "building_id": customer.building_id,
        "property_type": customer.property_type,
        "archetype": profile.get("archetype"),
        "occupants": customer.occupants,
        "area_m2": customer.area_m2,
        "expected_winter_kwh": profile.get("expected_winter_kwh"),
        "expected_summer_kwh": profile.get("expected_summer_kwh"),
        "review_status": customer.review_status,
    }
    if summary:
        ctx.update(
            {
                "risk_score": round(summary.risk_score, 1),
                "status": summary.status,
                "confidence_score": round(summary.confidence_score, 1),
                "estimated_loss_eur": round(summary.estimated_loss_eur, 2),
                "trigger_groups_in_agreement": summary.groups_fired,
                "risk_components": {
                    "personal_behavior": round(summary.personal_anomaly, 3),
                    "seasonal": round(summary.seasonal_deviation, 3),
                    "peer": round(summary.peer_deviation, 3),
                    "geographic": round(summary.geographic_anomaly, 3),
                },
                "anomaly_model_score": round(summary.anomaly_score, 3),
                "fired_triggers": json.loads(summary.triggers_json or "[]"),
                "reasons": json.loads(summary.reasons_json or "[]"),
                "comparisons": json.loads(summary.comparisons_json or "{}"),
            }
        )
    ctx["recent_consumption_kwh"] = [
        {
            "year": h.year,
            "month": h.month,
            "season": h.season,
            "temperature_c": h.temperature,
            "consumption_kwh": round(h.consumption_kwh, 1),
        }
        for h in history
    ]
    return ctx


def _context_text(ctx: dict[str, Any]) -> str:
    return json.dumps(ctx, ensure_ascii=False, indent=2)


def _fallback_answer(ctx: dict[str, Any], question: str) -> str:
    name = ctx.get("name") or ctx.get("customer_id")
    status = ctx.get("status", "Unknown")
    risk = ctx.get("risk_score", 0)
    conf = ctx.get("confidence_score", 0)
    loss = ctx.get("estimated_loss_eur", 0)
    reasons = ctx.get("reasons", []) or []
    groups = ctx.get("trigger_groups_in_agreement", 0)
    bullets = " ".join(f"- {r}" for r in reasons[:5]) or "- No fraud-indicating triggers fired."
    return (
        f"{name} ({ctx.get('district', 'Tirana')}) is currently classified as "
        f"{status} with a risk score of {risk}/100 and {conf}% confidence, "
        f"supported by {groups} independent trigger groups in agreement. "
        f"Estimated unbilled energy value is approximately EUR {loss}. "
        f"Key evidence: {bullets} "
        "Recommended next step: schedule an on-site meter-integrity inspection."
    )


def _fallback_summary(ctx: dict[str, Any]) -> str:
    return _fallback_answer(ctx, "summary")


async def _call_gemini(system: str, context_text: str, turns: list[dict[str, str]]) -> str | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    contents: list[dict[str, Any]] = [
        {"role": "user", "parts": [{"text": f"VoltGuard analysis data context:\n{context_text}"}]},
        {"role": "model", "parts": [{"text": "Understood. I will answer only from this data."}]},
    ]
    for turn in turns:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400},
    }
    url = GEMINI_URL.format(model=settings.gemini_model)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url, params={"key": settings.gemini_api_key}, json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
            return text or None
    except Exception:
        return None


async def investigate_chat(
    db: Session, customer_id: str, messages: list[dict[str, str]]
) -> dict[str, Any]:
    ctx = build_customer_context(db, customer_id)
    if ctx is None:
        return {"mode": "error", "answer": "Customer not found."}

    text = await _call_gemini(SYSTEM_INSTRUCTION, _context_text(ctx), messages)
    if text is None:
        last = messages[-1]["content"] if messages else ""
        return {"mode": "fallback", "answer": _fallback_answer(ctx, last)}
    return {"mode": "gemini", "answer": text}


async def investigate_summary(db: Session, customer_id: str) -> dict[str, Any]:
    ctx = build_customer_context(db, customer_id)
    if ctx is None:
        return {"mode": "error", "summary": "Customer not found."}

    prompt = [
        {
            "role": "user",
            "content": (
                "Give a brief investigation summary (3-4 sentences) of the most "
                "important findings for this customer: risk level, the strongest "
                "evidence, estimated losses, and a recommended action."
            ),
        }
    ]
    text = await _call_gemini(SYSTEM_INSTRUCTION, _context_text(ctx), prompt)
    if text is None:
        return {"mode": "fallback", "summary": _fallback_summary(ctx)}
    return {"mode": "gemini", "summary": text}
