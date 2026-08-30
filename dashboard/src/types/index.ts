export type NodeType = 'primary_db' | 'replica_db' | 'auth' | 'file_storage' | 'cache_search' | 'gateway' | 'unknown';
export type NodeStatus = 'online' | 'offline' | 'degraded' | 'starting' | 'disabled';
export type CommandType = 'restart' | 'disable' | 'enable' | 'update_config' | 'collect_logs' | 'ping';

export interface NodeMetrics {
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  net_bytes_sent: number;
  net_bytes_recv: number;
  latency_ms: number;
  timestamp: string;
}

export interface NodeInfo {
  id?: string;
  node_id: string;
  name: string;
  type?: NodeType;
  node_type: NodeType;
  host: string;
  port: number;
  region?: string;
  status: NodeStatus;
  metrics?: NodeMetrics;
  last_heartbeat?: string;
  service_status?: Record<string, boolean>;
  version?: string;
}

export interface ClusterStats {
  total_nodes: number;
  online_nodes: number;
  offline_nodes?: number;
  degraded_nodes?: number;
  cluster_health_score: number;
  health_score?: number;
  avg_cpu_percent: number;
  avg_cpu?: number;
  avg_ram_percent: number;
  avg_ram?: number;
  total_disk_gb: number;
  used_disk_gb: number;
  total_disk_used_gb?: number;
  total_disk_capacity_gb?: number;
}

export interface LogEntry {
  id: string;
  node_id: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: string;
  source?: string;
}

export interface NodeCommand {
  command: CommandType;
  payload?: Record<string, unknown>;
}
