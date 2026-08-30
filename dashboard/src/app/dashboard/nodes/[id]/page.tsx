'use client';
import { useNode } from '@/hooks/useNodes';
import { MetricSparkline } from '@/components/MetricSparkline';
import { MetricGauge } from '@/components/MetricGauge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NodeStatusBadge } from '@/components/NodeStatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function NodeDetailPage({ params }: { params: { id: string } }) {
  const { node, loading } = useNode(params.id);

  if (loading) return <div>Loading...</div>;
  if (!node) return <div>Node not found</div>;

  const handleCommand = async (cmd: any) => {
    try {
      await api.sendCommand(node.node_id || node.id || params.id, cmd);
      toast.success(`Command ${cmd} sent`);
    } catch (e) {
      toast.error('Command failed');
    }
  };

  // Mock historical data for charts
  const mockHistory = Array.from({length: 20}).map((_, i) => ({
    timestamp: new Date(Date.now() - (20-i)*60000).toISOString(),
    value: Math.random() * 100
  }));

  const nodeType = (node.node_type || node.type || 'unknown').replace('_', ' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/nodes">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{node.name}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-muted-foreground capitalize">{nodeType}</span>
            <NodeStatusBadge status={node.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">CPU Usage</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <MetricGauge value={node.metrics?.cpu_percent || 0} label="CPU" />
            <div className="w-full mt-4"><MetricSparkline data={mockHistory} color="#22c55e" label="" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Memory Usage</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <MetricGauge value={node.metrics?.ram_percent || 0} label="RAM" />
            <div className="w-full mt-4"><MetricSparkline data={mockHistory} color="#3b82f6" label="" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Disk Usage</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <MetricGauge value={node.metrics?.disk_percent || 0} label="DISK" />
            <div className="w-full mt-4"><MetricSparkline data={mockHistory} color="#eab308" label="" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Commands</CardTitle></CardHeader>
        <CardContent className="flex space-x-4">
          <Button onClick={() => handleCommand('ping')}>Ping Node</Button>
          <Button variant="secondary" onClick={() => handleCommand('restart')}>Restart Service</Button>
          <Button variant="destructive" onClick={() => handleCommand(node.status === 'disabled' ? 'enable' : 'disable')}>
            {node.status === 'disabled' ? 'Enable Node' : 'Disable Node'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
