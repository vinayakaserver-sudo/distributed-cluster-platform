'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConsoleSidebar } from '@/components/ConsoleSidebar';
import { vkcloud } from '@/lib/vkcloud';
import { Bell, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = vkcloud.getUser();
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <ConsoleSidebar />

      <div className="flex flex-1 flex-col pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-white">Project:</span>
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-mono text-blue-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>default-production</span>
            </div>
            <span className="text-xs text-muted-foreground">• Region: ap-southeast-1 (Singapore)</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="https://distributed-cluster-platform.vercel.app/dashboard"
              target="_blank"
              className="inline-flex items-center space-x-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-white"
            >
              <span>Cluster Admin Dashboard</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
