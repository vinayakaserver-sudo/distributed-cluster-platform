import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/types';

export function LogViewer({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-blue-400';
      case 'WARNING': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      case 'CRITICAL': return 'text-red-600 font-bold';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-black text-gray-300 font-mono text-sm p-4 rounded-md h-[500px] overflow-y-auto border border-border">
      {logs.map((log, i) => (
        <div key={log.id || i} className="mb-1 flex">
          <span className="text-gray-500 mr-4 w-48 shrink-0">
            {new Date(log.timestamp).toLocaleString()}
          </span>
          <span className={`w-20 shrink-0 ${getColor(log.level)}`}>[{log.level}]</span>
          <span className="text-gray-400 mr-2 w-32 shrink-0 truncate" title={log.node_id}>{log.node_id.split('-')[0]}</span>
          <span className="break-all">{log.message}</span>
        </div>
      ))}
      {logs.length === 0 && <div className="text-gray-500 italic">No logs available.</div>}
      <div ref={endRef} />
    </div>
  );
}
