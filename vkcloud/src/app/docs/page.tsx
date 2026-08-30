'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { 
  Database, 
  Users, 
  FolderOpen, 
  Zap, 
  Terminal, 
  ShieldCheck, 
  ArrowRight, 
  Copy, 
  Check, 
  Layers, 
  Sparkles,
  Server,
  Code2,
  HardDrive,
  Key,
  Globe,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

export default function DocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'js' | 'python' | 'curl'>('js');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-600 selection:text-white">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Table of Contents Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-border pb-3">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Documentation
                </span>
              </div>
              <nav className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <a href="#quickstart" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">1. Quickstart (5-Min Setup)</a>
                <a href="#multi-tenancy" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">2. Multi-Tenant DB Isolation</a>
                <a href="#database" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">3. PostgreSQL Database</a>
                <a href="#auth" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">4. User Authentication</a>
                <a href="#storage" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">5. Permanent Object Storage</a>
                <a href="#cache" className="block rounded-lg px-2.5 py-1.5 hover:bg-muted hover:text-white transition-colors">6. Cache & Full-Text Search</a>
              </nav>

              <div className="border-t border-border pt-4">
                <Link
                  href="/console"
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
                >
                  <span>Open Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-12">
            {/* Header Banner */}
            <div>
              <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>VKCloud Developer API Reference • v1.0</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
                Building on VKCloud
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Connect your web, mobile, or backend applications to our distributed cloud cluster in Singapore. Use serverless PostgreSQL, user authentication, permanent cloud storage, and ultra-fast in-memory caching.
              </p>
            </div>

            {/* Language Selector Bar */}
            <div className="flex items-center space-x-2 rounded-xl border border-border bg-card/60 p-1.5 backdrop-blur-md">
              <span className="px-3 text-xs font-semibold text-muted-foreground uppercase">SDK Language:</span>
              <button
                onClick={() => setActiveTab('js')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'js' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'
                }`}
              >
                JavaScript / TypeScript
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'python' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setActiveTab('curl')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'curl' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'
                }`}
              >
                cURL / REST
              </button>
            </div>

            {/* 1. Quickstart */}
            <section id="quickstart" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">1. Quickstart (5-Minute Setup)</h2>
                  <p className="text-xs text-muted-foreground">Get your credentials and start communicating with the cluster</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Every application sends requests through our high-performance **API Gateway**, which routes traffic to the appropriate backend node in the Singapore cluster:
              </p>

              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Gateway Base URL</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Status: 200 OK</span>
                  </div>
                  <code className="block rounded bg-muted/60 p-2.5 font-mono text-blue-400">
                    https://cluster-api-gateway.onrender.com
                  </code>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1.5">
                  <span className="font-semibold text-white">Authentication Header Format</span>
                  <code className="block rounded bg-muted/60 p-2.5 font-mono text-yellow-400">
                    Authorization: Bearer YOUR_JWT_TOKEN
                  </code>
                </div>
              </div>
            </section>

            {/* 2. Multi-Tenant DB Isolation */}
            <section id="multi-tenancy" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">2. Multi-Tenant Database Isolation</h2>
                  <p className="text-xs text-muted-foreground">Dedicated PostgreSQL namespace for each registered developer</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                When you sign up on VKCloud, your account is provisioned with a private **PostgreSQL Schema**:
                <code className="mx-1.5 rounded bg-muted px-2 py-0.5 text-purple-400 font-mono font-semibold">tenant_{'{username}'}</code>.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1">
                  <h4 className="font-semibold text-white text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>No Table Name Collisions</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    You can create tables named <code>users</code>, <code>posts</code>, or <code>products</code> without interfering with any other developer.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1">
                  <h4 className="font-semibold text-white text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>PostgreSQL 16 Engine</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Powered by serverless Neon with native ACID compliance, indexes, JSONB, and primary/replica failover.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Database */}
            <section id="database" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">3. PostgreSQL Database API</h2>
                  <p className="text-xs text-muted-foreground">Execute SQL queries, insert rows, and manage tables</p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-xs font-mono text-cyan-300 border border-border">
                POST https://cluster-api-gateway.onrender.com/db/query
              </div>

              {activeTab === 'js' && (
                <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-blue-300">
                  <button
                    onClick={() => copyCode(`// 1. Create a table in your isolated schema\nawait fetch("https://cluster-api-gateway.onrender.com/db/query", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_JWT_TOKEN",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    sql: "CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, title TEXT, done BOOLEAN DEFAULT false);"\n  })\n});\n\n// 2. Insert and Query rows\nconst res = await fetch("https://cluster-api-gateway.onrender.com/db/query", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_JWT_TOKEN",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    sql: "SELECT * FROM todos WHERE done = false;"\n  })\n});\nconst { rows } = await res.json();\nconsole.log(rows);`, 'js-db')}
                    className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-white"
                  >
                    {copiedSection === 'js-db' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre>{`// 1. Create a table in your isolated schema
await fetch("https://cluster-api-gateway.onrender.com/db/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    sql: "CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, title TEXT, done BOOLEAN DEFAULT false);"
  })
});

// 2. Insert and Query rows
const res = await fetch("https://cluster-api-gateway.onrender.com/db/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    sql: "SELECT * FROM todos WHERE done = false;"
  })
});
const { rows } = await res.json();
console.log(rows);`}</pre>
                </div>
              )}

              {activeTab === 'python' && (
                <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-emerald-300">
                  <button
                    onClick={() => copyCode(`import httpx\n\nheaders = {\n    "Authorization": "Bearer YOUR_JWT_TOKEN",\n    "Content-Type": "application/json"\n}\n\n# Query data\npayload = {"sql": "SELECT * FROM products ORDER BY price DESC LIMIT 10;"}\nres = httpx.post("https://cluster-api-gateway.onrender.com/db/query", json=payload, headers=headers)\nprint(res.json()["rows"])`, 'py-db')}
                    className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-white"
                  >
                    {copiedSection === 'py-db' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre>{`import httpx

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
}

# Query data
payload = {"sql": "SELECT * FROM products ORDER BY price DESC LIMIT 10;"}
res = httpx.post("https://cluster-api-gateway.onrender.com/db/query", json=payload, headers=headers)
print(res.json()["rows"])`}</pre>
                </div>
              )}

              {activeTab === 'curl' && (
                <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-yellow-300">
                  <button
                    onClick={() => copyCode(`curl -X POST "https://cluster-api-gateway.onrender.com/db/query" \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sql": "SELECT * FROM information_schema.tables;"}'`, 'curl-db')}
                    className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-white"
                  >
                    {copiedSection === 'curl-db' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre>{`curl -X POST "https://cluster-api-gateway.onrender.com/db/query" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"sql": "SELECT * FROM information_schema.tables;"}'`}</pre>
                </div>
              )}
            </section>

            {/* 4. Auth */}
            <section id="auth" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">4. User Authentication API</h2>
                  <p className="text-xs text-muted-foreground">Register and authenticate your own end-users with JWT</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase">Register User</span>
                  <code className="block rounded bg-muted/60 p-2 font-mono text-[11px]">
                    POST /auth/register
                  </code>
                  <pre className="font-mono text-[11px] text-muted-foreground">{`{
  "username": "customer_1",
  "email": "cust@example.com",
  "password": "Password123"
}`}</pre>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <span className="text-xs font-semibold text-blue-400 uppercase">Login & Get JWT</span>
                  <code className="block rounded bg-muted/60 p-2 font-mono text-[11px]">
                    POST /auth/login
                  </code>
                  <pre className="font-mono text-[11px] text-muted-foreground">{`{
  "username": "customer_1",
  "password": "Password123"
}`}</pre>
                </div>
              </div>
            </section>

            {/* 5. Storage */}
            <section id="storage" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">5. Permanent Object Storage</h2>
                  <p className="text-xs text-muted-foreground">Upload files, media, and stream downloads with zero egress charges</p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-xs font-mono text-yellow-300 border border-border">
                POST https://cluster-api-gateway.onrender.com/files/upload
              </div>

              <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-yellow-300">
                <button
                  onClick={() => copyCode(`const formData = new FormData();\nformData.append("file", fileInput.files[0]);\n\nconst res = await fetch("https://cluster-api-gateway.onrender.com/files/upload", {\n  method: "POST",\n  headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" },\n  body: formData\n});\n\nconst { file_id, url } = await res.json();\nconsole.log("File Download URL:", url);`, 'js-storage')}
                  className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-white"
                >
                  {copiedSection === 'js-storage' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <pre>{`const formData = new FormData();
formData.append("file", fileInput.files[0]);

const res = await fetch("https://cluster-api-gateway.onrender.com/files/upload", {
  method: "POST",
  headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" },
  body: formData
});

const { file_id, url } = await res.json();
console.log("File Download URL:", url);`}</pre>
              </div>
            </section>

            {/* 6. Cache & Search */}
            <section id="cache" className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">6. In-Memory Cache & Full-Text Search</h2>
                  <p className="text-xs text-muted-foreground">Store transient key-value data with TTL and perform keyword searches</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <span className="text-xs font-semibold text-purple-400 uppercase">Set Key-Value (TTL)</span>
                  <code className="block rounded bg-muted/60 p-2 font-mono text-[11px]">
                    PUT /cache/{'{key}'}
                  </code>
                  <pre className="font-mono text-[11px] text-muted-foreground">{`{
  "value": "user_session_payload",
  "ttl_seconds": 3600
}`}</pre>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                  <span className="text-xs font-semibold text-blue-400 uppercase">Full-Text Search</span>
                  <code className="block rounded bg-muted/60 p-2 font-mono text-[11px]">
                    GET /search?q=keywords
                  </code>
                  <pre className="font-mono text-[11px] text-muted-foreground">{`// Returns matched documents
[
  { "id": "doc-1", "title": "...", "content": "..." }
]`}</pre>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
