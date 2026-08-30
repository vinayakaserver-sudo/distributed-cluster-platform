import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-red-500';
    case 'degraded': return 'bg-yellow-500';
    case 'starting': return 'bg-blue-500';
    case 'disabled': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
}

export function getNodeTypeLabel(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function formatLatency(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}
