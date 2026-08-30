'use client';
import { useNodes, useClusterStats } from '@/hooks/useNodes';
import { ClusterStats } from '@/components/ClusterStats';
import { NodeStatusBadge } from '@/components/NodeStatusBadge';
import { MetricGauge } from '@/components/MetricGauge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function DashboardPage() {
  const { nodes, loading } = useNodes();
  const { stats } = useClusterStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground mt-2">Monitor your cluster health and node status.</p>
      </div>

      <ClusterStats stats={stats} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold tracking-tight">Nodes</h3>
          <Link href="/dashboard/nodes" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading nodes...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nodes.map(node => {
              const nodeId = node.node_id || node.id || '';
              const nodeType = (node.node_type || node.type || 'unknown').replace('_', ' ');
              return (
              <Card key={nodeId} className="hover:bg-card/80 transition-colors">
                <CardHeader className="pb-2 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      <Link href={`/dashboard/nodes/${nodeId}`} className="hover:underline">
                        {node.name}
                      </Link>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">{nodeType}</div>
                  </div>
                  <NodeStatusBadge status={node.status} />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-4 border-t pt-4">
                    <MetricGauge value={node.metrics?.cpu_percent || 0} label="CPU" />
                    <MetricGauge value={node.metrics?.ram_percent || 0} label="RAM" />
                    <MetricGauge value={node.metrics?.disk_percent || 0} label="DISK" />
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
