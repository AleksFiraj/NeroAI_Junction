from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.explainability.gemini import investigate_chat, investigate_summary
from app.schemas.ai import (
    AiChatRequest,
    AiChatResponse,
    AiSummaryResponse,
)

router = APIRouter()


@router.post("/ai/chat", response_model=AiChatResponse)
async def ai_chat(payload: AiChatRequest, db: Session = Depends(get_db)) -> AiChatResponse:
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    result = await investigate_chat(db, payload.customer_id, messages)
    return AiChatResponse(mode=result.get("mode", "fallback"), answer=result.get("answer", ""))


@router.get("/ai/summary/{customer_id}", response_model=AiSummaryResponse)
async def ai_summary(customer_id: str, db: Session = Depends(get_db)) -> AiSummaryResponse:
    result = await investigate_summary(db, customer_id)
    return AiSummaryResponse(mode=result.get("mode", "fallback"), summary=result.get("summary", ""))
