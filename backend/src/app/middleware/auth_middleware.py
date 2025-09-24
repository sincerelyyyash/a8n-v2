from typing import Callable
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from ..utils.auth_utils import decode_jwt


EXEMPT_PATH_PREFIXES = (
    "/openapi.json",
    "/docs",
    "/redoc",
    "/api/v1/user",
    "/api/v1/webhook",
)


class AuthValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        path = request.url.path

        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        if any(path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return await call_next(request)

        token = request.cookies.get("token")
        user_id_cookie = request.cookies.get("user_id")

        if not token or not user_id_cookie:
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        payload = decode_jwt(token)
        if not payload:
            return JSONResponse({"detail": "Invalid or expired token"}, status_code=403)

        try:
            user_id_from_token = int(payload.get("user_id"))
            user_id_from_cookie = int(user_id_cookie)
        except Exception:
            return JSONResponse({"detail": "Invalid authentication context"}, status_code=401)

        if user_id_from_token != user_id_from_cookie:
            return JSONResponse({"detail": "Authentication mismatch"}, status_code=401)

        request.state.user_id = user_id_from_token

        return await call_next(request)


