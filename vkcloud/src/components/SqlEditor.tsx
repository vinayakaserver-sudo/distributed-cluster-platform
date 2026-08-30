'use client';
import { useState } from 'react';
import { Play, RotateCcw, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { toast } from 'sonner';

interface SqlEditorProps {
  onResults: (data: { rows: any[]; row_count: number; execution_time_ms: number }) => void;
  initialSql?: string;
}

const TEMPLATES = [
  { label: 'Select All Users', sql: 'SELECT * FROM users LIMIT 10;' },
  { label: 'Create Test Table', sql: 'CREATE TABLE IF NOT EXISTS items (\n  id SERIAL PRIMARY KEY,\n  title TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);' },
  { label: 'Insert Sample Row', sql: "INSERT INTO items (title) VALUES ('First Cloud Item') RETURNING *;" },
  { label: 'Database Version', sql: 'SELECT version();' },
];

export function SqlEditor({ onResults, initialSql = 'SELECT * FROM information_schema.tables WHERE table_schema=\'public\';' }: SqlEditorProps) {
  const [sql, setSql] = useState(initialSql);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number; time: number } | null>(null);

  const handleExecute = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await vkcloud.runQuery(sql);
      onResults(res);
      setStats({ count: res.row_count, time: res.execution_time_ms });
      toast.success(`Query executed in ${res.execution_time_ms}ms`);
    } catch (err: any) {
      setError(err.message || 'Query execution failed');
      toast.error('SQL Execution Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SQL Query</span>
          <div className="hidden sm:flex items-center space-x-1 pl-2">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                onClick={() => setSql(tmpl.sql)}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-white"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {stats && (
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{stats.count} rows ({stats.time}ms)</span>
            </div>
          )}
          <button
            onClick={() => setSql('')}
            title="Clear editor"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{loading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Query Textarea */}
      <div className="relative">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Write your PostgreSQL query here... (e.g. SELECT * FROM users;)"
          rows={5}
          className="w-full resize-y bg-background/50 p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 border-t border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-mono">{error}</span>
        </div>
      )}
    </div>
  );
}
