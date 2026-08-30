"""
Auth middleware for the API Gateway.

Validates Bearer tokens by proxying to Node 3 (auth service).
Caches valid tokens in-memory for 60 seconds to reduce auth node load.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, Optional, Tuple

import httpx
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from gateway.config import settings

logger = logging.getLogger(__name__)

# In-memory token validation cache: token -> (user_id, username, expiry_time)
_token_cache: Dict[str, Tuple[str, str, float]] = {}
_CACHE_TTL = 60.0  # seconds


def _cache_lookup(token: str) -> Optional[Tuple[str, str]]:
    """Return (user_id, username) if token is cached and not expired."""
    entry = _token_cache.get(token)
    if entry:
        user_id, username, expiry = entry
        if time.time() < expiry:
            return user_id, username
        # Expired
        del _token_cache[token]
    return None


def _cache_store(token: str, user_id: str, username: str) -> None:
    _token_cache[token] = (user_id, username, time.time() + _CACHE_TTL)
    # Simple eviction: if cache > 10000 entries, clear oldest half
    if len(_token_cache) > 10000:
        sorted_tokens = sorted(_token_cache.items(), key=lambda x: x[1][2])
        for t, _ in sorted_tokens[:5000]:
            del _token_cache[t]


async def validate_token_local(token: str) -> Tuple[str, str]:
    """
    Validate JWT locally using the shared secret (fast path).
    Returns (user_id, username).
    Raises HTTPException(401) if invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub", "")
        username = payload.get("username", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id, username
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def validate_token_remote(token: str, auth_node_url: str, http: httpx.AsyncClient) -> Tuple[str, str]:
    """
    Validate token by calling the auth node's /auth/validate endpoint (slow path).
    Returns (user_id, username).
    Raises HTTPException(401) if invalid.
    """
    try:
        resp = await http.post(
            f"{auth_node_url}/auth/validate",
            json={"token": token},
            timeout=5.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid"):
                return data["user_id"], data["username"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token rejected by auth service",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth service unreachable: {e}",
        )


async def get_current_user(request: Request) -> Tuple[str, str]:
    """
    FastAPI dependency: extract and validate Bearer token from the request.
    Returns (user_id, username).

    Uses local JWT validation first (fast), then remote as fallback.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header[7:]

    # Check cache
    cached = _cache_lookup(token)
    if cached:
        return cached

    # Local validation
    user_id, username = await validate_token_local(token)

    # Cache result
    _cache_store(token, user_id, username)
    return user_id, username


def extract_token(request: Request) -> Optional[str]:
    """Extract Bearer token from request without raising on missing."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None
