'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Database, 
  Users, 
  FolderOpen, 
  Zap, 
  Key, 
  Activity, 
  ArrowRight, 
  Plus, 
  Sparkles,
  Server,
  Layers,
  Terminal
} from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { ProjectStats } from '@/types';
import { SqlEditor } from '@/components/SqlEditor';
import { TableEditor } from '@/components/TableEditor';

export default function ConsoleOverviewPage() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [queryResult, setQueryResult] = useState<{ rows: any[]; row_count: number; execution_time_ms: number } | null>(null);
  const user = vkcloud.getUser();

  useEffect(() => {
    vkcloud.getProjectStats().then(setStats);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome, <span className="text-blue-400">{user?.username || 'Developer'}</span> 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Your distributed backend cluster is live and running on Singapore edge nodes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/console/api-keys"
            className="inline-flex items-center space-x-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-white hover:bg-muted transition-colors"
          >
            <Key className="h-3.5 w-3.5 text-yellow-400" />
            <span>Get API Keys</span>
          </Link>
          <Link
            href="/console/database"
            className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Open Database Studio</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <Link
          href="/console/database"
          className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-blue-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">PostgreSQL DB</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats?.active_tables ?? '...'}</span>
            <span className="text-xs text-muted-foreground">Active Tables</span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Neon Serverless Connected</span>
          </div>
        </Link>

        {/* Card 2 */}
        <Link
          href="/console/auth"
          className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-cyan-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Auth Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats?.total_auth_users ?? '...'}</span>
            <span className="text-xs text-muted-foreground">Registered Users</span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px] text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            <span>JWT & Bcrypt Active</span>
          </div>
        </Link>

        {/* Card 3 */}
        <Link
          href="/console/storage"
          className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-emerald-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Cloud Storage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats?.total_storage_files ?? '...'}</span>
            <span className="text-xs text-muted-foreground">Stored Files</span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Permanent Retention</span>
          </div>
        </Link>

        {/* Card 4 */}
        <Link
          href="/console/cache"
          className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-purple-500/50 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Key-Value Cache</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{stats?.total_cache_keys ?? '...'}</span>
            <span className="text-xs text-muted-foreground">Active Keys</span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px] text-purple-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span>Fast In-Memory Engine</span>
          </div>
        </Link>
      </div>

      {/* Quick SQL Playground */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Interactive SQL Runner</h3>
          </div>
          <Link href="/console/database" className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:underline">
            <span>Full Database Studio</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <SqlEditor onResults={setQueryResult} />

        {queryResult && (
          <TableEditor
            rows={queryResult.rows}
            rowCount={queryResult.row_count}
            executionTime={queryResult.execution_time_ms}
          />
        )}
      </div>
    </div>
  );
}
