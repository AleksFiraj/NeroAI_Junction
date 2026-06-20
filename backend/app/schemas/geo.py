from pydantic import BaseModel


class HeatmapResponse(BaseModel):
    district_summary: list[dict]
    building_summary: list[dict]
    hotspots: list[dict]
