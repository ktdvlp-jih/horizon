from fastapi import APIRouter, Request

from app.schemas.coach import CoachRequest, CoachResponse

router = APIRouter(prefix="/internal/v1", tags=["coach"])


@router.post("/coach", response_model=CoachResponse)
async def coach(req: CoachRequest, request: Request) -> CoachResponse:
    service = request.app.state.coach_service
    return service.coach(req)
