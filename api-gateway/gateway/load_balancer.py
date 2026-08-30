"""
Health-aware load balancer for the API Gateway.

Maintains per-node-type pools and routes traffic based on:
- Node health (online/offline from control plane)
- Round-robin within a pool
- Write vs read distinction (writes always go to primary DB)
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

import httpx

from gateway.config import settings

logger = logging.getLogger(__name__)


class NodeType(str, Enum):
    PRIMARY_DB = "primary_db"
    REPLICA_DB = "replica_db"
    AUTH = "auth"
    FILE_STORAGE = "file_storage"
    CACHE_SEARCH = "cache_search"


@dataclass
class BackendNode:
    node_id: str
    node_type: NodeType
    url: str
    is_healthy: bool = True
    last_checked: float = field(default_factory=time.time)
    failure_count: int = 0
    request_count: int = 0


class LoadBalancer:
    """
    Health-aware round-robin load balancer.
    Periodically syncs node list from the control plane.
    """

    def __init__(self) -> None:
        # node_type -> list of backends
        self._pools: Dict[NodeType, List[BackendNode]] = defaultdict(list)
        # Round-robin counters per pool
        self._counters: Dict[NodeType, int] = defaultdict(int)
        self._lock = asyncio.Lock()
        self._http: Optional[httpx.AsyncClient] = None
        self._health_task: Optional[asyncio.Task] = None

        # Seed with static config as fallback
        self._seed_from_config()

    def _seed_from_config(self) -> None:
        """Seed pools with static URLs from config (used before control plane sync)."""
        static = [
            (NodeType.PRIMARY_DB, settings.NODE_1_URL, "static-node-1"),
            (NodeType.REPLICA_DB, settings.NODE_2_URL, "static-node-2"),
            (NodeType.AUTH, settings.NODE_3_URL, "static-node-3"),
            (NodeType.FILE_STORAGE, settings.NODE_4_URL, "static-node-4"),
            (NodeType.CACHE_SEARCH, settings.NODE_5_URL, "static-node-5"),
        ]
        for node_type, url, node_id in static:
            if url:
                self._pools[node_type].append(
                    BackendNode(node_id=node_id, node_type=node_type, url=url)
                )

    async def start(self, http_client: httpx.AsyncClient) -> None:
        """Start background health-check loop."""
        self._http = http_client
        self._health_task = asyncio.create_task(self._health_check_loop())
        logger.info("LoadBalancer started")

    async def stop(self) -> None:
        if self._health_task:
            self._health_task.cancel()
            try:
                await self._health_task
            except asyncio.CancelledError:
                pass
        logger.info("LoadBalancer stopped")

    async def _health_check_loop(self) -> None:
        """Periodically check node health and sync from control plane."""
        while True:
            try:
                await self._sync_from_control_plane()
                await self._check_all_nodes()
            except Exception as e:
                logger.warning(f"Health check loop error: {e}")
            await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL)

    async def _sync_from_control_plane(self) -> None:
        """Fetch current node list from control plane and update pools."""
        if not self._http or not settings.CONTROL_PLANE_URL:
            return
        try:
            resp = await self._http.get(
                f"{settings.CONTROL_PLANE_URL}/api/v1/nodes",
                headers={"Authorization": f"Bearer {settings.CONTROL_PLANE_API_KEY}"},
                timeout=5.0,
            )
            if resp.status_code != 200:
                return
            nodes = resp.json()
            async with self._lock:
                # Rebuild pools from control plane data
                new_pools: Dict[NodeType, List[BackendNode]] = defaultdict(list)
                for node in nodes:
                    if node.get("status") == "offline" or not node.get("is_enabled", True):
                        continue
                    try:
                        node_type = NodeType(node["node_type"])
                    except ValueError:
                        continue
                    url = f"http://{node['host']}:{node['port']}"
                    existing = self._find_node(node["node_id"])
                    if existing:
                        existing.url = url
                        existing.is_healthy = node.get("status") == "online"
                        new_pools[node_type].append(existing)
                    else:
                        new_pools[node_type].append(
                            BackendNode(
                                node_id=node["node_id"],
                                node_type=node_type,
                                url=url,
                                is_healthy=node.get("status") == "online",
                            )
                        )
                # Merge: if control plane returned nodes, use them; else keep static
                for node_type, backends in new_pools.items():
                    if backends:
                        self._pools[node_type] = backends
            logger.debug("Synced nodes from control plane")
        except Exception as e:
            logger.warning(f"Control plane sync failed: {e}")

    def _find_node(self, node_id: str) -> Optional[BackendNode]:
        for pool in self._pools.values():
            for node in pool:
                if node.node_id == node_id:
                    return node
        return None

    async def _check_all_nodes(self) -> None:
        """Ping /health on all nodes to update health status."""
        tasks = []
        nodes = [n for pool in self._pools.values() for n in pool]
        for node in nodes:
            tasks.append(self._check_node_health(node))
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_node_health(self, node: BackendNode) -> None:
        if not self._http:
            return
        try:
            resp = await self._http.get(f"{node.url}/health", timeout=5.0)
            async with self._lock:
                node.is_healthy = resp.status_code == 200
                node.failure_count = 0
                node.last_checked = time.time()
        except Exception:
            async with self._lock:
                node.failure_count += 1
                node.is_healthy = False
                node.last_checked = time.time()

    async def get_node(
        self, node_type: NodeType, prefer_healthy: bool = True
    ) -> Optional[BackendNode]:
        """Get next node for a given type using round-robin, health-aware."""
        async with self._lock:
            pool = self._pools.get(node_type, [])
            if not pool:
                return None

            healthy = [n for n in pool if n.is_healthy] if prefer_healthy else pool
            candidates = healthy if healthy else pool  # fallback to all if none healthy

            idx = self._counters[node_type] % len(candidates)
            self._counters[node_type] += 1
            node = candidates[idx]
            node.request_count += 1
            return node

    async def get_primary_db(self) -> Optional[BackendNode]:
        """Always return the primary DB node (writes must go here)."""
        async with self._lock:
            pool = self._pools.get(NodeType.PRIMARY_DB, [])
            for node in pool:
                if node.is_healthy:
                    return node
            # fallback to any primary
            return pool[0] if pool else None

    async def get_read_db(self) -> Optional[BackendNode]:
        """Return replica for reads, fallback to primary."""
        replica = await self.get_node(NodeType.REPLICA_DB)
        if replica:
            return replica
        return await self.get_primary_db()

    def get_pool_status(self) -> Dict[str, List[Dict]]:
        """Return pool status for monitoring."""
        result = {}
        for node_type, pool in self._pools.items():
            result[node_type.value] = [
                {
                    "node_id": n.node_id,
                    "url": n.url,
                    "is_healthy": n.is_healthy,
                    "failure_count": n.failure_count,
                    "request_count": n.request_count,
                    "last_checked": n.last_checked,
                }
                for n in pool
            ]
        return result


load_balancer = LoadBalancer()
