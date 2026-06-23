from typing import Any

from pydantic import BaseModel, Field

# Field names are camelCase to match the Spring (Jackson) JSON contract.


class CoachSettings(BaseModel):
    systemPrompt: str | None = None
    userPromptTemplate: str | None = None
    model: str | None = None
    baseUrl: str | None = None
    apiKey: str | None = None
    temperature: float | None = None
    llmEnabled: bool | None = None
    ruleWeights: dict[str, Any] | None = None
    gradeThresholds: dict[str, Any] | None = None
    learningPointDefault: str | None = None


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
    coachSettings: CoachSettings | None = None


class CoachResponse(BaseModel):
    score: int
    grade: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    learningPoint: str
    source: str  # "llm" | "rule"


class DisasterMetricsPayload(BaseModel):
    mode: str
    gridSize: int
    totalCells: int
    tileCounts: dict[str, int] = Field(default_factory=dict)
    affectedRatio: float
    maxRisk: float
    avgRisk: float
    protectedRatio: float
    floodCells: float | None = None
    windHighCells: float | None = None
    collapseRiskCells: float | None = None
    evacWithin3MinRatio: float | None = None
    inundatedCells: float | None = None
    highGroundCoverage: float | None = None


class DisasterCoachRequest(BaseModel):
    mode: str
    regionName: str
    scenarioTitle: str
    metrics: DisasterMetricsPayload
    coachSettings: CoachSettings | None = None


class ResilienceCoachRequest(BaseModel):
    """Unified multi-axis coaching over a single city design."""

    region: str
    scenarioTitle: str | None = None
    axisScores: dict[str, float] = Field(default_factory=dict)
    resilienceScore: float
    balancePenalty: float = 0.0
    # Raw per-lens metrics (heat/air/disaster/agriculture) for richer prompts.
    lensMetrics: dict[str, Any] | None = None
    coachSettings: CoachSettings | None = None
