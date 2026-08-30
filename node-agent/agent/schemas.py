"""
Shared Pydantic schemas used across control-plane, node-agent, and api-gateway.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class NodeType(str, Enum):
    PRIMARY_DB = "primary_db"
    REPLICA_DB = "replica_db"
    AUTH = "auth"
    FILE_STORAGE = "file_storage"
    CACHE_SEARCH = "cache_search"
    GATEWAY = "gateway"
    UNKNOWN = "unknown"


class NodeStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    STARTING = "starting"
    DISABLED = "disabled"


class CommandType(str, Enum):
    RESTART = "restart"
    DISABLE = "disable"
    ENABLE = "enable"
    UPDATE_CONFIG = "update_config"
    COLLECT_LOGS = "collect_logs"
    PING = "ping"


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

class NodeMetrics(BaseModel):
    cpu_percent: float = Field(0.0, ge=0, le=100, description="CPU usage %")
    ram_percent: float = Field(0.0, ge=0, le=100, description="RAM usage %")
    ram_used_mb: float = Field(0.0, description="RAM used in MB")
    ram_total_mb: float = Field(0.0, description="Total RAM in MB")
    disk_percent: float = Field(0.0, ge=0, le=100, description="Disk usage %")
    disk_used_gb: float = Field(0.0, description="Disk used in GB")
    disk_total_gb: float = Field(0.0, description="Total disk in GB")
    net_bytes_sent: int = Field(0, description="Network bytes sent (cumulative)")
    net_bytes_recv: int = Field(0, description="Network bytes received (cumulative)")
    latency_ms: float = Field(0.0, description="Round-trip latency to control plane in ms")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Node Registration
# ---------------------------------------------------------------------------

class NodeRegisterRequest(BaseModel):
    name: str = Field(..., description="Human-readable node name, e.g. 'node-1-primary-db'")
    node_type: NodeType
    host: str = Field(..., description="Public host/IP of this node")
    port: int = Field(..., description="Port the agent listens on")
    region: Optional[str] = Field(None, description="Cloud region, e.g. 'us-east-1'")
    version: str = Field("0.1.0", description="Agent version")
    tags: Dict[str, str] = Field(default_factory=dict)


class NodeRegisterResponse(BaseModel):
    node_id: str
    api_key: str
    control_plane_ws_url: str
    heartbeat_interval_seconds: int = 10


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

class HeartbeatRequest(BaseModel):
    node_id: str
    metrics: NodeMetrics
    service_status: Dict[str, bool] = Field(
        default_factory=dict,
        description="e.g. {'postgres': True, 'redis': False}"
    )
    errors: List[str] = Field(default_factory=list)


class HeartbeatResponse(BaseModel):
    received: bool = True
    server_time: datetime = Field(default_factory=datetime.utcnow)
    pending_commands: List["NodeCommand"] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Node Info (full view)
# ---------------------------------------------------------------------------

class NodeInfo(BaseModel):
    node_id: str
    name: str
    node_type: NodeType
    status: NodeStatus
    host: str
    port: int
    region: Optional[str]
    version: str
    tags: Dict[str, str]
    last_heartbeat: Optional[datetime]
    registered_at: datetime
    metrics: Optional[NodeMetrics]
    service_status: Dict[str, bool]
    errors: List[str]


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

class NodeCommand(BaseModel):
    command_id: str
    command_type: CommandType
    payload: Dict[str, Any] = Field(default_factory=dict)
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    issued_by: str = "admin"


class CommandResult(BaseModel):
    command_id: str
    node_id: str
    success: bool
    output: Optional[str]
    error: Optional[str]
    executed_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Cluster Stats
# ---------------------------------------------------------------------------

class ClusterStats(BaseModel):
    total_nodes: int
    online_nodes: int
    offline_nodes: int
    degraded_nodes: int
    avg_cpu_percent: float
    avg_ram_percent: float
    total_disk_gb: float
    used_disk_gb: float
    cluster_health_score: float = Field(
        ..., ge=0, le=100, description="0-100 cluster health score"
    )
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Log Entry
# ---------------------------------------------------------------------------

class LogEntry(BaseModel):
    log_id: str
    node_id: Optional[str]
    level: str  # INFO, WARNING, ERROR, CRITICAL
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: Optional[str]


# ---------------------------------------------------------------------------
# Auth (Admin dashboard)
# ---------------------------------------------------------------------------

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600


# Update forward refs
HeartbeatResponse.model_rebuild()
