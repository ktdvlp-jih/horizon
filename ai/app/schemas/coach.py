from pydantic import BaseModel, Field

# Field names are camelCase to match the Spring (Jackson) JSON contract.


class CoachRequest(BaseModel):
    region: str
    baseAirTemp: float
    solarLoad: float
    gridSize: int
    greenRatio: float
    imperviousRatio: float
    waterRatio: float
    avgSurfaceTemp: float
    maxSurfaceTemp: float
    deltaT: float
    tileCounts: dict[str, int] = Field(default_factory=dict)


class CoachResponse(BaseModel):
    score: int
    grade: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    learningPoint: str
    source: str  # "llm" | "rule"
