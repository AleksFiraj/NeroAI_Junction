"""LLM narration layer (STRICTLY explain-only).

The LLM may ONLY convert already-computed trigger reasons into natural-language
inspector notes. It never computes risk, detects anomalies, or influences
scoring. If no API key is configured it falls back to a deterministic template.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings


def _fallback_summary(
    customer_id: str, reasons: list[str], risk_score: float, status: str
) -> str:
    bullets = " ".join(f"- {item}" for item in reasons[:5])
    return (
        f"Customer {customer_id} is classified as {status} with a risk score of "
        f"{risk_score:.1f}/100. Evidence: {bullets} Recommended next step: schedule an "
        "on-site inspection and a meter-integrity check."
    )


async def generate_human_explanation(
    customer_id: str,
    reasons: list[str],
    risk_score: float,
    status: str,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.llm_api_key:
        return {
            "mode": "template_fallback",
            "summary": _fallback_summary(customer_id, reasons, risk_score, status),
        }

    prompt = (
        "You are an electricity-fraud investigation assistant for Tirana, Albania. "
        "Rewrite the provided structured trigger reasons into concise, actionable "
        "inspector notes. You must NOT invent facts, compute risk, or add new "
        "findings; only rephrase what is given.\n\n"
        f"Customer ID: {customer_id}\n"
        f"Risk Score: {risk_score:.1f}\n"
        f"Status: {status}\n"
        f"Trigger reasons: {reasons}\n"
    )

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                json={
                    "model": settings.llm_model,
                    "input": prompt,
                    "max_output_tokens": 280,
                },
            )
            response.raise_for_status()
            payload = response.json()
            text = payload.get("output_text") or _fallback_summary(
                customer_id, reasons, risk_score, status
            )
            return {"mode": "llm", "summary": text}
    except Exception:
        return {
            "mode": "template_fallback",
            "summary": _fallback_summary(customer_id, reasons, risk_score, status),
        }
