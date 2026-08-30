"""
Request router: maps incoming paths to the appropriate backend node.

Route table:
  /auth/*          → Node 3 (auth)
  /files/*         → Node 4 (file_storage)
  /search/*        → Node 5 (cache_search)
  /cache/*         → Node 5 (cache_search)
  /jobs/*          → Node 5 (cache_search)
  /db/*            → Node 1/2 (primary for writes, replica for reads)
  /data/*          → Node 1/2 (alias for /db)
  /health          → local (gateway health)
  /status          → load balancer pool status
"""
from __future__ import annotations

import logging
import time
from enum import Enum
from typing import Optional, Tuple

from fastapi import Request

from gateway.load_balancer import BackendNode, NodeType, load_balancer

logger = logging.getLogger(__name__)

# HTTP methods considered read-only
READ_METHODS = {"GET", "HEAD", "OPTIONS"}


class RouteTarget(str, Enum):
    PRIMARY_DB = "primary_db"
    READ_DB = "read_db"          # replica preferred, fallback primary
    AUTH = "auth"
    FILE_STORAGE = "file_storage"
    CACHE_SEARCH = "cache_search"
    GATEWAY_LOCAL = "gateway_local"  # handled by gateway itself


def classify_route(path: str, method: str) -> RouteTarget:
    """
    Determine which backend should handle a given path + method.
    """
    # Strip leading slash and split
    parts = path.lstrip("/").split("/")
    prefix = parts[0].lower() if parts else ""

    if prefix in ("auth",):
        return RouteTarget.AUTH

    if prefix in ("files", "file"):
        return RouteTarget.FILE_STORAGE

    if prefix in ("search",):
        return RouteTarget.CACHE_SEARCH

    if prefix in ("cache",):
        return RouteTarget.CACHE_SEARCH

    if prefix in ("jobs",):
        return RouteTarget.CACHE_SEARCH

    if prefix in ("db", "data"):
        # Writes to primary, reads to replica
        if method.upper() in READ_METHODS:
            return RouteTarget.READ_DB
        return RouteTarget.PRIMARY_DB

    return RouteTarget.GATEWAY_LOCAL


async def resolve_backend(route_target: RouteTarget) -> Optional[BackendNode]:
    """
    Resolve a RouteTarget to a concrete BackendNode.
    """
    if route_target == RouteTarget.PRIMARY_DB:
        return await load_balancer.get_primary_db()

    if route_target == RouteTarget.READ_DB:
        return await load_balancer.get_read_db()

    type_map = {
        RouteTarget.AUTH: NodeType.AUTH,
        RouteTarget.FILE_STORAGE: NodeType.FILE_STORAGE,
        RouteTarget.CACHE_SEARCH: NodeType.CACHE_SEARCH,
    }
    node_type = type_map.get(route_target)
    if node_type:
        return await load_balancer.get_node(node_type)

    return None


async def route_request(request: Request) -> Tuple[Optional[BackendNode], str]:
    """
    Main routing function. Returns (backend_node, downstream_path).
    downstream_path is the path to forward to the backend.
    """
    path = request.url.path
    method = request.method

    route_target = classify_route(path, method)
    backend = await resolve_backend(route_target)

    logger.debug(f"{method} {path} → {route_target} → {backend.url if backend else 'None'}")
    return backend, path
