from fastapi import APIRouter

from app.explainability.llm import generate_human_explanation
from app.schemas.explanation import AIExplanationRequest, AIExplanationResponse

router = APIRouter()


@router.post("/ai-explanation", response_model=AIExplanationResponse)
async def ai_explanation(payload: AIExplanationRequest) -> AIExplanationResponse:
    result = await generate_human_explanation(
        customer_id=payload.customer_id,
        reasons=payload.reasons,
        risk_score=payload.risk_score,
        status=payload.status,
    )
    return AIExplanationResponse(mode=result["mode"], summary=result["summary"])
