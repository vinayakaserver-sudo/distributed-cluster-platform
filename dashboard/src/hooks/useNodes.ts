import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { NodeInfo, ClusterStats, LogEntry } from '@/types';
import { clusterWS } from '@/lib/ws';

export function useNodes() {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = async () => {
    try {
      const data = await api.getNodes();
      setNodes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);

    const handleNodeUpdate = (updatedNode: NodeInfo) => {
      const updatedId = updatedNode.node_id || updatedNode.id;
      setNodes(prev => {
        const idx = prev.findIndex(n => (n.node_id || n.id) === updatedId);
        if (idx === -1) return [...prev, updatedNode];
        const newNodes = [...prev];
        newNodes[idx] = updatedNode;
        return newNodes;
      });
    };

    clusterWS.on('node_update', handleNodeUpdate);
    return () => {
      clearInterval(interval);
      clusterWS.off('node_update', handleNodeUpdate);
    };
  }, []);

  return { nodes, loading, refetch: fetchNodes };
}

export function useNode(id: string) {
  const [node, setNode] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchNode = async () => {
      try {
        const data = await api.getNode(id);
        setNode(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNode();
    const interval = setInterval(fetchNode, 5000);
    return () => clearInterval(interval);
  }, [id]);

  return { node, loading };
}

export function useClusterStats() {
  const [stats, setStats] = useState<ClusterStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getClusterStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return { stats };
}
