import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { NodeStatusBadge } from './NodeStatusBadge';
import { MetricGauge } from './MetricGauge';
import type { NodeInfo } from '@/types';
import { Play, Square, RefreshCw, Trash2, FileText } from 'lucide-react';
import Link from 'next/link';

export function NodeCard({ node, onAction }: { node: NodeInfo, onAction: (id: string, action: string) => void }) {
  const m = node.metrics;
  const nodeId = node.node_id || node.id || '';
  const nodeType = (node.node_type || node.type || 'unknown').replace('_', ' ');

  return (
    <Card className="hover:bg-card/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              <Link href={`/dashboard/nodes/${nodeId}`} className="hover:underline">{node.name}</Link>
            </CardTitle>
            <div className="text-sm text-muted-foreground capitalize mt-1">{nodeType}</div>
            <div className="text-xs text-muted-foreground mt-1">{node.region || 'Unknown region'}</div>
          </div>
          <NodeStatusBadge status={node.status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between items-center py-4 border-b">
          <MetricGauge value={m?.cpu_percent || 0} label="CPU" />
          <MetricGauge value={m?.ram_percent || 0} label="RAM" />
          <MetricGauge value={m?.disk_percent || 0} label="DISK" />
        </div>
        <div className="py-2 text-sm grid grid-cols-2 gap-2 mt-2">
          <div className="text-muted-foreground">Latency: <span className="text-foreground">{m?.latency_ms?.toFixed(1) || 0}ms</span></div>
          <div className="text-muted-foreground">Uptime: <span className="text-foreground">Active</span></div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-2 border-t">
        <Button variant="outline" size="icon" title="Ping" onClick={() => onAction(nodeId, 'ping')}>
          <Play className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" title="Restart" onClick={() => onAction(nodeId, 'restart')}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" title="Toggle status" onClick={() => onAction(nodeId, node.status === 'disabled' ? 'enable' : 'disable')}>
          <Square className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" title="Remove" onClick={() => onAction(nodeId, 'remove')}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
