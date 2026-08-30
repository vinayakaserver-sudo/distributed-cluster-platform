import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Server, Cpu, HardDrive } from 'lucide-react';
import type { ClusterStats as IClusterStats } from '@/types';
import { formatBytes } from '@/lib/utils';

export function ClusterStats({ stats }: { stats: IClusterStats | null }) {
  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Nodes</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.online_nodes} / {stats.total_nodes}</div>
          <p className="text-xs text-muted-foreground">Online cluster nodes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {(stats.cluster_health_score ?? stats.health_score ?? 100).toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground">System healthy</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg CPU / RAM</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.avg_cpu_percent ?? stats.avg_cpu ?? 0).toFixed(1)}% / {(stats.avg_ram_percent ?? stats.avg_ram ?? 0).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">Average resource usage</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.used_disk_gb ?? stats.total_disk_used_gb ?? 0).toFixed(1)} GB
          </div>
          <p className="text-xs text-muted-foreground">of {(stats.total_disk_gb ?? stats.total_disk_capacity_gb ?? 0).toFixed(1)} GB total</p>
        </CardContent>
      </Card>
    </div>
  );
}
