'use client';
import { useState } from 'react';
import { useNodes } from '@/hooks/useNodes';
import { NodeTable } from '@/components/NodeTable';
import { NodeCard } from '@/components/NodeCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { LayoutGrid, List } from 'lucide-react';

export default function NodesPage() {
  const { nodes, loading, refetch } = useNodes();
  const [viewMode, setViewMode] = useState<'grid'|'table'>('table');
  const [search, setSearch] = useState('');

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'remove') {
        await api.deleteNode(id);
        toast.success(`Node ${id} removed`);
      } else {
        await api.sendCommand(id, action as any);
        toast.success(`Command ${action} sent to node`);
      }
      refetch();
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const filteredNodes = nodes.filter(n => {
    const nameMatch = n.name.toLowerCase().includes(search.toLowerCase());
    const typeStr = (n.node_type || n.type || '').toLowerCase();
    const typeMatch = typeStr.includes(search.toLowerCase());
    return nameMatch || typeMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nodes</h2>
          <p className="text-muted-foreground mt-1">Manage cluster nodes.</p>
        </div>
        <Button onClick={() => toast('Add Node dialog would open here')}>Add Node</Button>
      </div>

      <div className="flex justify-between items-center bg-card p-2 rounded-md border">
        <input 
          type="text" 
          placeholder="Search nodes..." 
          className="bg-transparent border-0 focus:ring-0 text-sm px-2 w-64 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex space-x-1 border-l pl-2">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('table')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading nodes...</div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNodes.map(node => (
              <NodeCard key={node.node_id || node.id} node={node} onAction={handleAction} />
            ))}
          </div>
        ) : (
          <NodeTable nodes={filteredNodes} onAction={handleAction} />
        )
      )}
    </div>
  );
}
