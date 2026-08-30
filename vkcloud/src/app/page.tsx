'use client';
import Link from 'next/link';
import { 
  Database, 
  Users, 
  FolderOpen, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Server, 
  Globe, 
  Cpu, 
  Terminal 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CodeSnippet } from '@/components/CodeSnippet';
import { getSdkSnippets } from '@/lib/sdk-templates';

export default function LandingPage() {
  const snippets = getSdkSnippets('https://cluster-api-gateway.onrender.com', 'vk_live_demo_key');

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center md:pt-28 md:pb-24">
        {/* Background glow orb */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/30 via-cyan-500/20 to-purple-600/30 blur-[120px]" />

        <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Distributed Multi-Cloud Architecture • Singapore Region</span>
        </div>

        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
          Build Faster with <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">VKCloud</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          The complete open-source developer platform. PostgreSQL Database, User Authentication, Permanent Object Storage, and In-Memory Cache — all in one unified cloud.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/50 hover:scale-[1.02]"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 rounded-xl border border-border bg-card/60 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-muted"
          >
            <Terminal className="h-5 w-5 text-muted-foreground" />
            <span>Open Console</span>
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>PostgreSQL & Neon Inside</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Multi-Tenant Auth & JWT</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Zero Egress Storage</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>100% Free Tier</span>
          </div>
        </div>
      </section>

      {/* Live Interactive Code Playground */}
      <section className="container mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">vkcloud-quickstart</span>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Works with JavaScript, Python, Dart & cURL</span>
          </div>
          <CodeSnippet snippets={snippets} title="SDK Playground" />
        </div>
      </section>

      {/* Feature Matrix */}
      <section id="features" className="container mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything your app needs in one place
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
            Replace dozens of cloud bills with a unified backend designed for developers.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div id="database" className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">PostgreSQL Database</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Instant serverless PostgreSQL powered by Neon. Run raw SQL, create dynamic tables, and enjoy primary & replica failover with isolated schemas per developer.
            </p>
          </div>

          {/* Feature 2 */}
          <div id="auth" className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Authentication & Users</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete user authentication out of the box. Secure bcrypt hashing, JWT access tokens, and user directory management.
            </p>
          </div>

          {/* Feature 3 */}
          <div id="storage" className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Permanent Object Storage</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload images, videos, and files directly to your cloud storage. Instant preview links and permanent cloud retention with zero egress fees.
            </p>
          </div>

          {/* Feature 4 */}
          <div id="cache" className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Fast In-Memory Cache</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sub-millisecond key-value caching with TTL expiration for user sessions, leaderboards, and frequent lookups.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">API Gateway & Load Balancing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Single unified gateway endpoint that automatically routes and load balances traffic across all backend cluster nodes.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-4">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Multi-Cloud Resilience</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Runs across distributed cloud providers with automatic heartbeat health tracking and automated failover.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/40 to-card p-12 backdrop-blur-xl">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to build your next big application?
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
            Create an account in 10 seconds and start querying databases, issuing auth tokens, and uploading files today.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:scale-105"
            >
              <span>Create Free Developer Account</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between space-y-4 px-6 sm:flex-row sm:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white">VKCloud</span>
            <span>© 2026 Distributed Cloud Platform</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/console" className="hover:text-white">Developer Console</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
            <Link href="/register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
