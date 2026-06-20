from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    region: str
    # daily metric series, e.g. {"temp": [31.2, 33.1, ...], "rain": [...]}
    series: dict[str, list[float]] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    summary: str
    insights: list[str]
    stats: dict[str, dict[str, float]]
    confidence: float | None = None
