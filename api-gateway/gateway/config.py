"""
API Gateway configuration using pydantic-settings.
"""
from __future__ import annotations

from typing import Dict, List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Control plane
    CONTROL_PLANE_URL: str = "https://distributed-cluster-platform.onrender.com"
    CONTROL_PLANE_API_KEY: str = ""  # Gateway's own API key for the control plane

    # JWT (same secret as control plane for token validation)
    JWT_SECRET: str = "super-cluster-secret-998877"
    JWT_ALGORITHM: str = "HS256"

    # Gateway
    GATEWAY_HOST: str = "0.0.0.0"
    GATEWAY_PORT: int = 9000

    # Node URLs - populated dynamically from control plane, but can be overridden
    NODE_1_URL: str = "https://cluster-node-1.onrender.com"  # primary_db
    NODE_2_URL: str = "https://cluster-node-2.onrender.com"  # replica_db
    NODE_3_URL: str = "https://cluster-node-3.onrender.com"  # auth
    NODE_4_URL: str = "https://cluster-node-4.onrender.com"  # file_storage
    NODE_5_URL: str = "https://cluster-node-5.onrender.com"  # cache_search

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
