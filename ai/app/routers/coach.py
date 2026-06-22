from fastapi import APIRouter, Request

from app.schemas.coach import CoachRequest, CoachResponse, DisasterCoachRequest
from app.services.disaster_coach_service import disaster_coach

router = APIRouter(prefix="/internal/v1", tags=["coach"])


@router.post("/coach", response_model=CoachResponse)
async def coach(req: CoachRequest, request: Request) -> CoachResponse:
    service = request.app.state.coach_service
    return service.coach(req)


@router.post("/coach/disaster", response_model=CoachResponse)
async def coach_disaster(req: DisasterCoachRequest) -> CoachResponse:
    return disaster_coach(req)
