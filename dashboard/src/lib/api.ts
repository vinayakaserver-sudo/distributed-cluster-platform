import type { CommandType, NodeInfo, ClusterStats, LogEntry, NodeMetrics } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiClient {
  private get token(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    
    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
      throw new Error(`API Error: ${res.statusText}`);
    }
    
    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Auth
  async login(username: string, password: string): Promise<{access_token: string}> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    if (typeof window !== 'undefined') localStorage.setItem('token', data.access_token);
    return data;
  }

  async getMe(): Promise<{username: string}> {
    return this.fetch<{username: string}>('/api/v1/auth/me');
  }

  // Nodes
  async getNodes(): Promise<NodeInfo[]> { return this.fetch<NodeInfo[]>('/api/v1/nodes'); }
  async getNode(id: string): Promise<NodeInfo> { return this.fetch<NodeInfo>(`/api/v1/nodes/${id}`); }
  async deleteNode(id: string): Promise<void> { return this.fetch<void>(`/api/v1/nodes/${id}`, { method: 'DELETE' }); }
  async sendCommand(nodeId: string, command: CommandType, payload?: Record<string, unknown>): Promise<void> {
    return this.fetch<void>(`/api/v1/nodes/${nodeId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command, payload })
    });
  }
  async enableNode(id: string): Promise<void> { return this.sendCommand(id, 'enable'); }
  async disableNode(id: string): Promise<void> { return this.sendCommand(id, 'disable'); }
  async getNodeMetrics(id: string): Promise<NodeMetrics[]> { return this.fetch<NodeMetrics[]>(`/api/v1/nodes/${id}/metrics`); }
  async getNodeLogs(id: string): Promise<LogEntry[]> { return this.fetch<LogEntry[]>(`/api/v1/nodes/${id}/logs`); }

  // Cluster
  async getClusterStats(): Promise<ClusterStats> { return this.fetch<ClusterStats>('/api/v1/cluster/stats'); }
  async getClusterLogs(): Promise<LogEntry[]> { return this.fetch<LogEntry[]>('/api/v1/cluster/logs'); }
}

export const api = new ApiClient();
