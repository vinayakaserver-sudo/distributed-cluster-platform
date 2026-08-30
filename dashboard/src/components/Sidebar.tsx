'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Server, Activity, HardDrive, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const nav = [
    { name: 'Overview', href: '/dashboard', icon: Activity },
    { name: 'Nodes', href: '/dashboard/nodes', icon: HardDrive },
    { name: 'Logs', href: '/dashboard/logs', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Server className="mr-2 h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight text-foreground">ClusterControl</span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
