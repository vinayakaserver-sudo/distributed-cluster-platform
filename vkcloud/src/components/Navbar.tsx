'use client';
import Link from 'next/link';
import { Cloud, Zap, ArrowRight } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(vkcloud.getUser());
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-lg shadow-blue-500/20">
            <Cloud className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xl font-bold tracking-tight text-white">VK<span className="text-blue-400">Cloud</span></span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
              v1.0
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
          <Link href="/docs#database" className="transition-colors hover:text-white">Database</Link>
          <Link href="/docs#auth" className="transition-colors hover:text-white">Auth</Link>
          <Link href="/docs#storage" className="transition-colors hover:text-white">Storage</Link>
          <Link href="/docs#cache" className="transition-colors hover:text-white">Cache & Search</Link>
          <Link href="/docs" className="transition-colors text-blue-400 font-semibold hover:text-blue-300">Docs</Link>
        </nav>

        <div className="flex items-center space-x-4">
          {user ? (
            <Link
              href="/console"
              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
            >
              <span>Go to Console</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/50"
              >
                <span>Start Free</span>
                <Zap className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
