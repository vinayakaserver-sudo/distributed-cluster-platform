import type { NodeInfo } from '@/types';
import { NodeStatusBadge } from './NodeStatusBadge';
import { Button } from './ui/button';
import { Play, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

export function NodeTable({ nodes, onAction }: { nodes: NodeInfo[], onAction: (id: string, action: string) => void }) {
  return (
    <div className="rounded-md border bg-card">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">CPU</th>
            <th className="px-4 py-3">RAM</th>
            <th className="px-4 py-3">Disk</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map(node => {
            const nodeId = node.node_id || node.id || '';
            const nodeType = (node.node_type || node.type || 'unknown').replace('_', ' ');
            return (
            <tr key={nodeId} className="border-b last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">
                <Link href={`/dashboard/nodes/${nodeId}`} className="hover:underline">{node.name}</Link>
              </td>
              <td className="px-4 py-3 capitalize">{nodeType}</td>
              <td className="px-4 py-3"><NodeStatusBadge status={node.status} /></td>
              <td className="px-4 py-3">{node.metrics?.cpu_percent?.toFixed(1) || 0}%</td>
              <td className="px-4 py-3">{node.metrics?.ram_percent?.toFixed(1) || 0}%</td>
              <td className="px-4 py-3">{node.metrics?.disk_percent?.toFixed(1) || 0}%</td>
              <td className="px-4 py-3 flex space-x-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAction(nodeId, 'ping')}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAction(nodeId, 'restart')}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onAction(nodeId, 'remove')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
            );
          })}
          {nodes.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">No nodes found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
