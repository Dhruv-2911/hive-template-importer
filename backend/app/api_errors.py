"""One error shape for every API failure: {"error": {"code", "message", "details"}}."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}
        self.headers = headers


def not_found(what: str) -> ApiError:
    return ApiError(404, "NOT_FOUND", f"That {what} doesn't exist. It may have been deleted.")


def error_body(code: str, message: str, details: dict[str, Any]) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": jsonable_encoder(details)}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            error_body(exc.code, exc.message, exc.details), status_code=exc.status, headers=exc.headers
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            error_body(
                "INVALID_REQUEST",
                "The request is missing something or has a value in the wrong form.",
                {"problems": exc.errors()},
            ),
            status_code=422,
        )
