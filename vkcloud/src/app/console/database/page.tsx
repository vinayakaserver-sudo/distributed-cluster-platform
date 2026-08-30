'use client';
import { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Table as TableIcon, Terminal, Play, CheckCircle2 } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { SqlEditor } from '@/components/SqlEditor';
import { TableEditor } from '@/components/TableEditor';
import { toast } from 'sonner';

export default function DatabaseStudioPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<{ rows: any[]; row_count: number; execution_time_ms: number } | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const list = await vkcloud.listTables();
      setTables(list);
      if (list.length > 0 && !activeTable) {
        selectAndLoadTable(list[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load database tables');
    } finally {
      setLoading(false);
    }
  };

  const selectAndLoadTable = async (tableName: string) => {
    setActiveTable(tableName);
    try {
      const res = await vkcloud.runQuery(`SELECT * FROM "${tableName}" LIMIT 50;`);
      setQueryResult(res);
    } catch (err: any) {
      toast.error(`Failed to load rows from ${tableName}`);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Database Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Execute SQL queries and inspect serverless PostgreSQL tables on Neon.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTables}
            disabled={loading}
            className="inline-flex items-center space-x-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Schema</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Tables List */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tables ({tables.length})
            </span>
          </div>

          <div className="space-y-1">
            {tables.map((t) => {
              const isSelected = activeTable === t;
              return (
                <button
                  key={t}
                  onClick={() => selectAndLoadTable(t)}
                  className={`flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-left font-mono text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: SQL Editor + Table Results */}
        <div className="lg:col-span-3 space-y-6">
          <SqlEditor
            onResults={(res) => setQueryResult(res)}
            initialSql={activeTable ? `SELECT * FROM "${activeTable}" LIMIT 50;` : 'SELECT * FROM information_schema.tables WHERE table_schema=\'public\';'}
          />

          <TableEditor
            rows={queryResult?.rows || []}
            rowCount={queryResult?.row_count}
            executionTime={queryResult?.execution_time_ms}
            tableName={activeTable || undefined}
            onRefresh={() => activeTable && selectAndLoadTable(activeTable)}
          />
        </div>
      </div>
    </div>
  );
}
