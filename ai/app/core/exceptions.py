from fastapi import Request
from fastapi.responses import JSONResponse


class AiServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def ai_service_error_handler(_: Request, exc: AiServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )
