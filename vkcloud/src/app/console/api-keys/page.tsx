'use client';
import { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff, Terminal, Sparkles, ShieldAlert } from 'lucide-react';
import { CodeSnippet } from '@/components/CodeSnippet';
import { getSdkSnippets } from '@/lib/sdk-templates';
import { vkcloud } from '@/lib/vkcloud';
import { toast } from 'sonner';

export default function ApiKeysPage() {
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const user = vkcloud.getUser();

  const gatewayUrl = 'https://cluster-api-gateway.onrender.com';
  const publishableKey = `vk_pub_${user?.username || 'user'}_ap_singapore_988`;
  const secretKey = `vk_sec_99887766554433221100_cluster_prod`;

  const snippets = getSdkSnippets(gatewayUrl, publishableKey);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">API Keys & SDK Setup</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Connect your web, mobile, or backend applications to VKCloud with our official SDKs.
        </p>
      </div>

      {/* API Keys Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Key className="h-4 w-4 text-yellow-400" />
          <span>Project Credentials & API Keys</span>
        </h3>

        <div className="space-y-4">
          {/* Gateway Endpoint */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Project Gateway Endpoint</label>
            <div className="mt-1.5 flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={gatewayUrl}
                className="flex-1 rounded-xl border border-border bg-background p-2.5 font-mono text-xs text-blue-400 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(gatewayUrl, 'Gateway URL')}
                className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-white hover:bg-muted/80"
              >
                {copiedKey === 'Gateway URL' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Public Key */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Publishable Client Key (Client-Safe)</label>
            <div className="mt-1.5 flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publishableKey}
                className="flex-1 rounded-xl border border-border bg-background p-2.5 font-mono text-xs text-emerald-400 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(publishableKey, 'Publishable Key')}
                className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-white hover:bg-muted/80"
              >
                {copiedKey === 'Publishable Key' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Secret Server Key (Keep Private)</label>
            <div className="mt-1.5 flex items-center space-x-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={secretKey}
                className="flex-1 rounded-xl border border-border bg-background p-2.5 font-mono text-xs text-yellow-400 focus:outline-none"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="rounded-xl border border-border bg-muted p-2.5 text-muted-foreground hover:text-white"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(secretKey, 'Secret Key')}
                className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-white hover:bg-muted/80"
              >
                {copiedKey === 'Secret Key' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span>Quickstart Code Snippets</span>
        </h3>
        <CodeSnippet snippets={snippets} />
      </div>
    </div>
  );
}
