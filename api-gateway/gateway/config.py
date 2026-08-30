"""
API Gateway configuration using pydantic-settings.
"""
from __future__ import annotations

from typing import Dict, List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Control plane
    CONTROL_PLANE_URL: str = "http://localhost:8000"
    CONTROL_PLANE_API_KEY: str = ""  # Gateway's own API key for the control plane

    # JWT (same secret as control plane for token validation)
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Gateway
    GATEWAY_HOST: str = "0.0.0.0"
    GATEWAY_PORT: int = 9000

    # Node URLs - populated dynamically from control plane, but can be overridden
    NODE_1_URL: str = "http://localhost:8001"  # primary_db
    NODE_2_URL: str = "http://localhost:8002"  # replica_db
    NODE_3_URL: str = "http://localhost:8003"  # auth
    NODE_4_URL: str = "http://localhost:8004"  # file_storage
    NODE_5_URL: str = "http://localhost:8005"  # cache_search

    # Load balancing
    HEALTH_CHECK_INTERVAL: int = 15  # seconds
    REQUEST_TIMEOUT: float = 30.0  # seconds

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
