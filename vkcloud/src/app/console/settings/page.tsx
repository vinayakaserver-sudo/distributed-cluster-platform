'use client';
import { useState } from 'react';
import { Settings, Shield, Server, Database, Globe, CheckCircle2 } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';

export default function SettingsPage() {
  const user = vkcloud.getUser();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Project Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your VKCloud project environment and infrastructure details.
        </p>
      </div>

      {/* General Info Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Server className="h-4 w-4 text-blue-400" />
          <span>Project Information</span>
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Project Name</span>
            <p className="text-sm font-bold text-white mt-1">default-production</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Primary Region</span>
            <p className="text-sm font-bold text-white mt-1">Singapore (ap-southeast-1)</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Database Engine</span>
            <p className="text-sm font-bold text-white mt-1">PostgreSQL 16 (Neon Serverless)</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Cluster Health</span>
            <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>100% Operational</span>
            </p>
          </div>
        </div>
      </div>

      {/* Direct Connection Strings */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Database className="h-4 w-4 text-cyan-400" />
          <span>Database Direct Connection</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          You can connect directly with Prisma, Drizzle, Django, or standard PostgreSQL drivers:
        </p>
        <div className="rounded-xl border border-border bg-background p-3 font-mono text-xs text-blue-300 overflow-x-auto">
          postgresql://neondb_owner:npg_lfB4gO0banJp@ep-super-block-b3urcuk2.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
        </div>
      </div>
    </div>
  );
}
