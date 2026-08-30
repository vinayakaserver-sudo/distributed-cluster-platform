'use client';
import { useState } from 'react';
import { Database, Plus, Search, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TableEditorProps {
  rows: any[];
  rowCount?: number;
  executionTime?: number;
  tableName?: string;
  onRefresh?: () => void;
}

export function TableEditor({ rows, rowCount, executionTime, tableName, onRefresh }: TableEditorProps) {
  const [search, setSearch] = useState('');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
          <Database className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No rows returned</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Run an SQL query above or select a table from the sidebar to inspect its records.
        </p>
      </div>
    );
  }

  const columns = Object.keys(rows[0]);
  const filteredRows = rows.filter((row) =>
    columns.some((col) =>
      String(row[col] ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleCopy = (val: any, cellKey: string) => {
    const text = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
    navigator.clipboard.writeText(text);
    setCopiedCell(cellKey);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCell(null), 2000);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/30 px-4 py-3 gap-3">
        <div className="flex items-center space-x-2">
          {tableName && (
            <span className="rounded bg-blue-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-blue-400 border border-blue-500/20">
              {tableName}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Showing <strong className="text-white">{filteredRows.length}</strong> of {rowCount ?? rows.length} records
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background/60 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-border bg-muted/60 text-muted-foreground uppercase">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center text-[10px] text-muted-foreground/60">#</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2.5 font-semibold text-white/90">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="transition-colors hover:bg-muted/40">
                <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground/60 select-none">
                  {rowIdx + 1}
                </td>
                {columns.map((col) => {
                  const cellVal = row[col];
                  const cellKey = `${rowIdx}-${col}`;
                  const isNull = cellVal === null || cellVal === undefined;
                  return (
                    <td
                      key={col}
                      onClick={() => handleCopy(cellVal, cellKey)}
                      className="group relative cursor-pointer px-4 py-2.5 max-w-xs truncate"
                      title="Click to copy"
                    >
                      <span className={isNull ? 'text-muted-foreground/50 italic' : 'text-foreground'}>
                        {isNull ? 'NULL' : typeof cellVal === 'object' ? JSON.stringify(cellVal) : String(cellVal)}
                      </span>
                      <span className="absolute right-2 top-2 hidden rounded bg-muted/80 p-1 text-muted-foreground group-hover:inline-block">
                        {copiedCell === cellKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
