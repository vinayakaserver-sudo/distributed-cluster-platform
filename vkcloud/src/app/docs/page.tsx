'use client';
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
  Server
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Table of Contents Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Documentation
              </span>
              <nav className="space-y-2 text-xs font-medium text-muted-foreground">
                <a href="#quickstart" className="block hover:text-white transition-colors">1. Quickstart (5-Min Setup)</a>
                <a href="#multi-tenancy" className="block hover:text-white transition-colors">2. Multi-Tenant DB Isolation</a>
                <a href="#database" className="block hover:text-white transition-colors">3. PostgreSQL Database</a>
                <a href="#auth" className="block hover:text-white transition-colors">4. User Authentication</a>
                <a href="#storage" className="block hover:text-white transition-colors">5. Object Storage</a>
                <a href="#cache" className="block hover:text-white transition-colors">6. Key-Value Cache & Search</a>
              </nav>
            </div>
          </div>

          {/* Main Docs Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Header */}
            <div>
              <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Developer Guide & API Reference</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Building on VKCloud
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Learn how to authenticate users, query your private PostgreSQL schema, upload files, and cache data with VKCloud.
              </p>
            </div>

            {/* Section 1: Quickstart */}
            <section id="quickstart" className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-blue-400" />
                <span>1. Quickstart</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Every developer on VKCloud receives a unique <strong>Gateway Endpoint</strong> and <strong>API Keys</strong>.
              </p>

              <div className="rounded-xl bg-muted/40 p-4 border border-border text-xs space-y-2">
                <p className="font-semibold text-white">Project Base URL:</p>
                <code className="block rounded bg-background p-2 font-mono text-blue-400">
                  https://cluster-api-gateway.onrender.com
                </code>
              </div>
            </section>

            {/* Section 2: Multi-Tenant DB Isolation */}
            <section id="multi-tenancy" className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Layers className="h-5 w-5 text-purple-400" />
                <span>2. Multi-Tenant Database Isolation</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you sign up on VKCloud, your account is provisioned with a <strong>dedicated PostgreSQL schema</strong>:
                <code className="mx-1.5 rounded bg-muted px-1.5 py-0.5 text-purple-400 font-mono">tenant_yourusername</code>.
                Your tables and records are 100% isolated from all other users.
              </p>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-purple-300">
                ✨ <strong>Zero Cross-Tenant Leakage:</strong> You can create tables with standard names like <code>users</code>, <code>orders</code>, or <code>products</code> without worrying about name conflicts with other developers.
              </div>
            </section>

            {/* Section 3: Database */}
            <section id="database" className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Database className="h-5 w-5 text-cyan-400" />
                <span>3. PostgreSQL Database API</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Send raw SQL or parameterized queries to your isolated schema.
              </p>

              <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-blue-300">
                <button
                  onClick={() => copyCode(`const res = await fetch("https://cluster-api-gateway.onrender.com/db/query", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_JWT_TOKEN",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    sql: "SELECT * FROM items WHERE price > 10;"\n  })\n});`, 'db-snippet')}
                  className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-white"
                >
                  {copiedSection === 'db-snippet' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <pre>
{`const res = await fetch("https://cluster-api-gateway.onrender.com/db/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    sql: "SELECT * FROM items WHERE price > 10;"
  })
});

const data = await res.json();
console.log(data.rows);`}
                </pre>
              </div>
            </section>

            {/* Section 4: Auth */}
            <section id="auth" className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <span>4. User Authentication</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Register and log in end-users for your mobile or web apps.
              </p>

              <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-emerald-300">
                <pre>
{`// Register a new customer
POST /auth/register
{
  "username": "customer_123",
  "email": "customer@example.com",
  "password": "SecurePassword!"
}

// Log in customer & get JWT
POST /auth/login
{
  "username": "customer_123",
  "password": "SecurePassword!"
}`}
                </pre>
              </div>
            </section>

            {/* Section 5: Storage */}
            <section id="storage" className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <FolderOpen className="h-5 w-5 text-yellow-400" />
                <span>5. Permanent Object Storage</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Upload files using standard multipart form-data.
              </p>

              <div className="relative rounded-xl border border-border bg-background p-4 font-mono text-xs text-yellow-300">
                <pre>
{`const formData = new FormData();
formData.append("file", fileInput.files[0]);

const res = await fetch("https://cluster-api-gateway.onrender.com/files/upload", {
  method: "POST",
  headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" },
  body: formData
});

const fileData = await res.json();
console.log("File URL:", fileData.url);`}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
