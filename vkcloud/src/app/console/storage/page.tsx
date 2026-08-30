'use client';
import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, HardDrive, ShieldCheck, Sparkles } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { StorageFile } from '@/types';
import { FileExplorer } from '@/components/FileExplorer';
import { formatBytes } from '@/lib/utils';
import { toast } from 'sonner';

export default function StorageStudioPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const list = await vkcloud.listFiles();
      setFiles(list);
    } catch (err: any) {
      toast.error('Failed to load files from storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Storage Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Store and stream images, documents, and media permanently in the cloud.
          </p>
        </div>

        <button
          onClick={fetchFiles}
          disabled={loading}
          className="inline-flex items-center space-x-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Files</span>
        </button>
      </div>

      {/* Storage Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Storage Used</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{formatBytes(totalBytes)}</span>
            <span className="text-xs text-muted-foreground">/ Unlimited Free</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-400">Zero bandwidth / egress charges</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Objects</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{files.length}</span>
            <span className="text-xs text-muted-foreground">Files</span>
          </div>
          <p className="mt-1 text-[11px] text-blue-400">Stored in Neon PostgreSQL (Singapore)</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Storage Backend</span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-lg font-bold text-white">Neon PostgreSQL BYTEA</span>
          </div>
          <p className="mt-1 text-[11px] text-purple-400">100% Free • No Credit Card Required</p>
        </div>
      </div>

      {/* File Explorer with Drag & Drop */}
      <FileExplorer files={files} onRefresh={fetchFiles} />
    </div>
  );
}
