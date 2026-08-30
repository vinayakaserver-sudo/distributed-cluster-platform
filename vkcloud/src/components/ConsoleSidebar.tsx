'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Cloud, 
  LayoutDashboard, 
  Database, 
  Users, 
  FolderOpen, 
  Zap, 
  Key, 
  Settings, 
  LogOut, 
  Activity,
  ExternalLink
} from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { name: 'Overview', href: '/console', icon: LayoutDashboard },
  { name: 'Database Studio', href: '/console/database', icon: Database },
  { name: 'Auth Studio', href: '/console/auth', icon: Users },
  { name: 'Storage Studio', href: '/console/storage', icon: FolderOpen },
  { name: 'Cache & Search', href: '/console/cache', icon: Zap },
  { name: 'API Keys & SDK', href: '/console/api-keys', icon: Key },
  { name: 'Settings', href: '/console/settings', icon: Settings },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(vkcloud.getUser());
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card/90 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link href="/console" className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-md shadow-blue-500/20">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white leading-tight">VK<span className="text-blue-400">Cloud</span></span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Console</span>
          </div>
        </Link>
      </div>

      {/* Cluster Status Indicator */}
      <div className="mx-4 my-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400">Cluster Live (Singapore)</span>
          </div>
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>

      {/* Nav Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Session */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 text-xs font-bold text-white">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'VK'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-semibold text-white">{user?.username || 'Developer'}</span>
              <span className="truncate text-[10px] text-muted-foreground">Free Tier</span>
            </div>
          </div>
          <button
            onClick={() => vkcloud.logout()}
            title="Sign out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
