import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.exceptions import AiServiceError, ai_service_error_handler
from app.routers import analyze, coach, health
from app.services.coach_service import CoachService
from app.services.llm_service import LlmService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.horizon_ai_log_level.upper())
    llm = LlmService(settings)
    app.state.llm = llm
    app.state.coach_service = CoachService(llm)
    logging.getLogger("horizon.ai").info(
        "Horizon AI started (llm_enabled=%s, model=%s)", llm.enabled, llm.model
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Horizon AI", version="0.1.0", lifespan=lifespan)

    # CORS is disabled by default: the AI service is called via Spring, not the browser.
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_exception_handler(AiServiceError, ai_service_error_handler)

    app.include_router(health.router)
    app.include_router(coach.router)
    app.include_router(analyze.router)
    return app


app = create_app()
