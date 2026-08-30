export interface DeveloperUser {
  id: string;
  username: string;
  email: string;
  token: string;
}

export interface TableColumn {
  name: string;
  type: string;
  is_nullable: boolean;
  is_primary: boolean;
}

export interface TableRow {
  [key: string]: any;
}

export interface TableSchema {
  table_name: string;
  columns: TableColumn[];
  row_count: number;
}

export interface StorageFile {
  file_id: string;
  filename: string;
  size: number;
  content_type?: string;
  created_at?: string;
  provider?: string;
}

export interface AuthAppUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

export interface CacheEntry {
  key: string;
  value: string;
  ttl_seconds?: number;
}

export interface SearchDoc {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface ProjectStats {
  active_tables: number;
  total_auth_users: number;
  total_storage_files: number;
  total_cache_keys: number;
  database_health: string;
  cluster_nodes_online: number;
}
