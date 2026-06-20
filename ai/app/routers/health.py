from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    llm = request.app.state.llm
    return {
        "status": "ok",
        "model": llm.model if llm.enabled else "rule-based",
    }
