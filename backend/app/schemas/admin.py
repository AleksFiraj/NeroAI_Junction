from pydantic import BaseModel, Field


class AddConsumptionRequest(BaseModel):
    consumption_kwh: float = Field(gt=0)
    year: int | None = None
    month: int | None = Field(default=None, ge=1, le=12)


class ReviewRequest(BaseModel):
    status: str = Field(pattern="^(open|fraud|resolved)$")
    note: str | None = None


class ActionResponse(BaseModel):
    message: str
    customer_id: str | None = None
    year: int | None = None
    month: int | None = None
    records_analyzed: int | None = None


class BulkUploadResponse(BaseModel):
    message: str
    year: int
    month: int
    rows_inserted: int
    rows_updated: int
    rows_skipped: int
    skipped_ids: list[str] = []
    records_analyzed: int | None = None
