"""
API Gateway main application.

Acts as the single entry point for all client requests:
 - Routes to correct backend node
 - Validates Bearer tokens (local JWT)
 - Load balances across healthy nodes
 - Provides /gateway/status for monitoring
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from gateway.auth import extract_token, get_current_user, validate_token_local
from gateway.config import settings
from gateway.load_balancer import load_balancer
from gateway.router import RouteTarget, classify_route, resolve_backend, route_request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared HTTP client
# ---------------------------------------------------------------------------
_http_client: httpx.AsyncClient | None = None

GATEWAY_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global _http_client
    _http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(settings.REQUEST_TIMEOUT),
        follow_redirects=True,
        limits=httpx.Limits(max_connections=200, max_keepalive_connections=50),
    )
    await load_balancer.start(_http_client)
    logger.info("API Gateway started on port %s", settings.GATEWAY_PORT)
    yield
    await load_balancer.stop()
    await _http_client.aclose()
    logger.info("API Gateway shut down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ClusterControl API Gateway",
    version="0.1.0",
    description="Single entry point for distributed cluster client requests",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Gateway-local endpoints
# ---------------------------------------------------------------------------


@app.get("/", tags=["Gateway"])
async def root():
    return {
        "name": "ClusterControl API Gateway",
        "version": "0.1.0",
        "docs": "/docs",
        "status": "/gateway/health",
    }


@app.get("/gateway/health", tags=["Gateway"])
async def gateway_health():
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - GATEWAY_START_TIME, 2),
        "timestamp": time.time(),
    }


@app.get("/gateway/status", tags=["Gateway"])
async def gateway_status():
    """Returns load balancer pool status (admin endpoint)."""
    return {
        "pools": load_balancer.get_pool_status(),
        "uptime_seconds": round(time.time() - GATEWAY_START_TIME, 2),
    }


# ---------------------------------------------------------------------------
# Auth pass-through (no token required to reach /auth/login or /auth/register)
# ---------------------------------------------------------------------------
AUTH_PUBLIC_PATHS = {"/auth/login", "/auth/register"}


async def _proxy_request(request: Request, override_path: str | None = None) -> Response:
    """
    Core proxy logic: forward the incoming request to the resolved backend node,
    stream the response back to the client.
    """
    if _http_client is None:
        raise HTTPException(status_code=503, detail="Gateway not ready")

    path = override_path or request.url.path

    # Determine backend
    backend, downstream_path = await route_request(request)

    if backend is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No healthy backend available for this route",
        )

    # Build target URL — preserve query string
    query = request.url.query
    target_url = f"{backend.url}{downstream_path}"
    if query:
        target_url = f"{target_url}?{query}"

    # Forward headers (strip hop-by-hop)
    headers = dict(request.headers)
    for hop in ("host", "transfer-encoding", "connection", "te", "trailer", "upgrade"):
        headers.pop(hop, None)
    # Add forwarding metadata
    headers["X-Forwarded-For"] = request.client.host if request.client else "unknown"
    headers["X-Forwarded-By"] = "cluster-gateway"

    # Read body
    body = await request.body()

    try:
        resp = await _http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
            timeout=settings.REQUEST_TIMEOUT,
        )
    except httpx.RequestError as e:
        logger.error(f"Proxy error to {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Backend node unreachable: {e}",
        )

    # Filter response headers
    response_headers = dict(resp.headers)
    for hop in ("transfer-encoding", "connection", "content-encoding"):
        response_headers.pop(hop, None)

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers,
        media_type=resp.headers.get("content-type"),
    )


# ---------------------------------------------------------------------------
# Catch-all proxy route
# ---------------------------------------------------------------------------


@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    tags=["Proxy"],
    include_in_schema=False,
)
async def proxy(request: Request, full_path: str):
    """
    Main proxy handler. Validates auth for protected routes, then forwards.
    """
    path = f"/{full_path}"

    # Skip auth for public paths and gateway-local paths
    is_public = (
        path in AUTH_PUBLIC_PATHS
        or path.startswith("/gateway/")
        or path in ("/", "/docs", "/openapi.json", "/redoc")
        or request.method == "OPTIONS"
    )

    if not is_public:
        token = extract_token(request)
        if token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        await validate_token_local(token)

    return await _proxy_request(request)
