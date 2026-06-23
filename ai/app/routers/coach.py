from fastapi import APIRouter, Request

from app.schemas.coach import (
    CoachRequest,
    CoachResponse,
    DisasterCoachRequest,
    ResilienceCoachRequest,
)
from app.services.disaster_coach_service import disaster_coach

router = APIRouter(prefix="/internal/v1", tags=["coach"])


@router.post("/coach", response_model=CoachResponse)
async def coach(req: CoachRequest, request: Request) -> CoachResponse:
    service = request.app.state.coach_service
    return service.coach(req)


@router.post("/coach/disaster", response_model=CoachResponse)
async def coach_disaster(req: DisasterCoachRequest) -> CoachResponse:
    return disaster_coach(req)


@router.post("/coach/resilience", response_model=CoachResponse)
async def coach_resilience(req: ResilienceCoachRequest, request: Request) -> CoachResponse:
    service = request.app.state.resilience_coach_service
    return service.coach(req)
