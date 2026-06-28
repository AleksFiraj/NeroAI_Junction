"""Gemini-grounded investigation assistant.

The LLM is used ONLY to narrate / answer questions about the Nero AI analysis
data. A strict factual context is built from the database and the model is
instructed to never invent facts. Without a GEMINI_API_KEY the module returns
deterministic, data-grounded answers from the same context.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Consumption, Customer, CustomerRiskSummary

log = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_INSTRUCTION = (
    "You are Nero AI's electricity-fraud investigation assistant for Tirana, "
    "Albania. Answer ONLY using the Nero AI analysis data provided in the "
    "context. Never invent numbers, names, customers, or findings. If the answer "
    "is not in the data, say you do not have that information.\n\n"
    "RESPONSE FORMAT RULES (strictly follow):\n"
    "- Keep every answer to 3–5 sentences maximum.\n"
    "- Lead with the most important finding or conclusion first.\n"
    "- Use plain language an inspector can act on — avoid raw metric names, "
    "decimal scores, or JSON field names.\n"
    "- When citing numbers, round to whole numbers or one decimal and include "
    "units (e.g. '82%', '~€1,200', '45 kWh').\n"
    "- Do NOT dump lists of all data fields. Only mention what directly answers "
    "the question.\n"
    "- Do not claim certainty of fraud; describe evidence, risk level, and "
    "confidence in human terms (e.g. 'high confidence', 'moderate risk').\n"
    "- End with a concrete recommended next step when appropriate."
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
        "connection_type": customer.connection_type,
        "meter_type": customer.meter_type,
        "transformer_id": customer.transformer_id,
        "archetype": profile.get("archetype"),
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
    risk = round(ctx.get("risk_score", 0))
    conf = round(ctx.get("confidence_score", 0))
    loss = round(ctx.get("estimated_loss_eur", 0))
    reasons = ctx.get("reasons", []) or []
    groups = ctx.get("trigger_groups_in_agreement", 0)
    components = ctx.get("risk_components", {})

    risk_label = "high" if risk >= 70 else "moderate" if risk >= 40 else "low"
    conf_label = "high" if conf >= 75 else "moderate" if conf >= 50 else "low"

    q = question.lower()

    if "loss" in q or "cost" in q or "financial" in q or "money" in q:
        return (
            f"The estimated unbilled energy for {name} is approximately €{loss:,}. "
            f"This is calculated from the gap between expected and actual consumption "
            f"across flagged months, valued at the configured tariff rate. "
            f"The customer's risk score is {risk}/100 with {conf_label} confidence."
        )

    if "confiden" in q or "how sure" in q or "certain" in q:
        return (
            f"The fraud assessment confidence for {name} is {conf}% ({conf_label}). "
            f"This is based on {groups} independent trigger groups firing in agreement. "
            f"Higher group agreement means the anomaly is corroborated by multiple "
            f"independent detection methods, not just a single signal."
        )

    if "detect" in q or "how" in q or "found" in q or "why" in q:
        top_reasons = reasons[:3] if reasons else ["No specific triggers fired."]
        evidence = " ".join(top_reasons)
        strongest = max(components.items(), key=lambda x: x[1], default=("none", 0))
        return (
            f"{name} was detected through {groups} trigger groups firing together. "
            f"The strongest signal comes from {strongest[0].replace('_', ' ')} analysis. "
            f"Key findings: {evidence}"
        )

    top_reason = reasons[0] if reasons else "No specific fraud indicators were triggered."
    return (
        f"{name} in {ctx.get('district', 'Tirana')} is flagged as {status} "
        f"with {risk_label} risk ({risk}/100) and {conf_label} confidence ({conf}%). "
        f"The primary concern: {top_reason} "
        f"Estimated unbilled energy is approximately €{loss:,}. "
        "Recommended next step: schedule an on-site meter-integrity inspection."
    )


def _fallback_summary(ctx: dict[str, Any]) -> str:
    return _fallback_answer(ctx, "summary")


def _data_report(ctx: dict[str, Any], question: str = "") -> str:
    name = ctx.get("name") or ctx.get("customer_id")
    customer_id = ctx.get("customer_id", "N/A")
    district = ctx.get("district", "Tirana")
    status = ctx.get("status", "Unknown")
    risk = round(ctx.get("risk_score", 0))
    conf = round(ctx.get("confidence_score", 0))
    loss = round(ctx.get("estimated_loss_eur", 0))
    reasons = ctx.get("reasons", []) or []
    groups = ctx.get("trigger_groups_in_agreement", 0)
    components = ctx.get("risk_components", {}) or {}
    strongest_component = max(components.items(), key=lambda x: x[1], default=("unknown", 0.0))

    recent = ctx.get("recent_consumption_kwh", []) or []
    last3 = recent[-3:]
    if last3:
        avg_last3 = round(sum(float(item.get("consumption_kwh", 0)) for item in last3) / len(last3), 1)
        recent_line = f"Recent usage (last 3 months average): {avg_last3} kWh."
    else:
        recent_line = "Recent usage (last 3 months average): not available."

    reason_lines = reasons[:3] if reasons else ["No specific fraud indicators were triggered."]
    reason_block = "\n".join(f"- {r}" for r in reason_lines)

    return (
        "Investigation report (data-based fallback):\n"
        f"- Customer: {name} ({customer_id})\n"
        f"- Location/Network: {district}, building {ctx.get('building_id', 'N/A')}, transformer {ctx.get('transformer_id', 'N/A')}\n"
        f"- Risk: {status} ({risk}/100) with {conf}% confidence, based on {groups} trigger groups in agreement\n"
        f"- Estimated unbilled energy value: approximately €{loss:,}\n"
        f"- Strongest signal: {strongest_component[0].replace('_', ' ')} ({round(float(strongest_component[1]) * 100)}%)\n"
        f"- {recent_line}\n"
        "Key findings:\n"
        f"{reason_block}\n"
        "Recommended action: prioritize meter-integrity inspection and on-site verification."
    )


GEMINI_TIMEOUT_SECONDS = 5


async def _call_gemini(system: str, context_text: str, turns: list[dict[str, str]]) -> str | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY is not set — using data report")
        return None

    contents: list[dict[str, Any]] = [
        {"role": "user", "parts": [{"text": f"Nero AI analysis data context:\n{context_text}"}]},
        {"role": "model", "parts": [{"text": "Understood. I will answer only from this data."}]},
    ]
    for turn in turns:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
    }
    url = GEMINI_URL.format(model=settings.gemini_model)
    log.info("Calling Gemini model=%s (timeout=%ds)", settings.gemini_model, GEMINI_TIMEOUT_SECONDS)

    try:
        async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                url, params={"key": settings.gemini_api_key}, json=payload
            )
            if resp.status_code != 200:
                log.warning("Gemini HTTP %s — using data report", resp.status_code)
                return None
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates:
                log.warning("Gemini returned no candidates — using data report")
                return None
            parts = candidates[0].get("content", {}).get("parts") or []
            text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
            if text:
                log.info("Gemini responded successfully (%d chars)", len(text))
            return text or None
    except httpx.TimeoutException:
        log.info("Gemini timed out after %ds — using data report", GEMINI_TIMEOUT_SECONDS)
        return None
    except Exception:
        log.exception("Gemini call failed — using data report")
        return None


async def investigate_chat(
    db: Session, customer_id: str, messages: list[dict[str, str]]
) -> dict[str, Any]:
    ctx = build_customer_context(db, customer_id)
    if ctx is None:
        return {"mode": "error", "answer": "Customer not found."}

    text = await _call_gemini(SYSTEM_INSTRUCTION, _context_text(ctx), messages)
    if not text:
        last = messages[-1]["content"] if messages else ""
        return {"mode": "data_report", "answer": _data_report(ctx, last)}
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
    if not text:
        return {"mode": "data_report", "summary": _data_report(ctx, "summary")}
    return {"mode": "gemini", "summary": text}
