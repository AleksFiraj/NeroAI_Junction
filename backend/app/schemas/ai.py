from pydantic import BaseModel, Field


class AiChatMessage(BaseModel):
    role: str = "user"
    content: str


class AiChatRequest(BaseModel):
    customer_id: str
    messages: list[AiChatMessage] = Field(default_factory=list)


class AiChatResponse(BaseModel):
    mode: str
    answer: str


class AiSummaryResponse(BaseModel):
    mode: str
    summary: str
