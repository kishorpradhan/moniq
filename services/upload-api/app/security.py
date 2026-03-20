import os
from typing import Callable, Awaitable

from fastapi import Request
from starlette.responses import JSONResponse, Response


async def require_api_key(
    request: Request, call_next: Callable[..., Awaitable[Response]]
):
    if request.url.path == "/health":
        return await call_next(request)

    expected = os.getenv("UPLOAD_API_KEY")
    if not expected:
        return JSONResponse({"detail": "Server not configured"}, status_code=500)

    provided = request.headers.get("x-api-key")
    if provided != expected:
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)
