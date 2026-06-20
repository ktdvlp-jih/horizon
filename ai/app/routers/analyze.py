from fastapi import APIRouter

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.weather_data import analyze_series

router = APIRouter(prefix="/internal/v1", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    return analyze_series(req)
