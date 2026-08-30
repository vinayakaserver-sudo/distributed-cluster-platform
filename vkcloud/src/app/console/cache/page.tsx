'use client';
import { useState } from 'react';
import { Zap, Search, Plus, Trash2, Key, CheckCircle2, ArrowRight } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { toast } from 'sonner';

export default function CacheStudioPage() {
  // Key-Value Cache States
  const [cacheKey, setCacheKey] = useState('');
  const [cacheValue, setCacheValue] = useState('');
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [lookupKey, setLookupKey] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');

  const handleSetCache = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cacheKey || !cacheValue) return;

    try {
      await vkcloud.setCache(cacheKey, cacheValue, cacheTtl);
      toast.success(`Cache key "${cacheKey}" stored with ${cacheTtl}s TTL`);
      setCacheKey('');
      setCacheValue('');
    } catch (err: any) {
      toast.error('Failed to set cache key');
    }
  };

  const handleLookupCache = async () => {
    if (!lookupKey) return;
    setLoading(true);
    try {
      const res = await vkcloud.getCache(lookupKey);
      setLookupResult(res);
      toast.success('Key retrieved from in-memory cache');
    } catch (err: any) {
      setLookupResult({ error: 'Key expired or not found' });
      toast.error('Key not found');
    } finally {
      setLoading(false);
    }
  };

  const handleIndexDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;

    try {
      await vkcloud.indexDocument({
        id: `doc-${Date.now()}`,
        title: docTitle,
        content: docContent,
      });
      toast.success('Document indexed into Whoosh search engine');
      setDocTitle('');
      setDocContent('');
    } catch (err: any) {
      toast.error('Failed to index document');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await vkcloud.search(searchQuery);
      setSearchResults(res || []);
      toast.success(`Search query returned ${res?.length || 0} results`);
    } catch (err: any) {
      toast.error('Search failed');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Cache & Search Studio</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Ultra-fast in-memory Key-Value store and full-text search indexing powered by Node 5.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Section 1: Key-Value Cache */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">In-Memory Key-Value Store</h3>
              <p className="text-xs text-muted-foreground">Store fast transient user data with TTL expiration</p>
            </div>
          </div>

          {/* Set Key Form */}
          <form onSubmit={handleSetCache} className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Set Cache Key</span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={cacheKey}
                onChange={(e) => setCacheKey(e.target.value)}
                placeholder="Key (e.g. user_session_99)"
                required
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <input
                type="number"
                value={cacheTtl}
                onChange={(e) => setCacheTtl(Number(e.target.value))}
                placeholder="TTL (seconds)"
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <textarea
              value={cacheValue}
              onChange={(e) => setCacheValue(e.target.value)}
              placeholder="Value / JSON Payload (e.g. {'role': 'admin'})"
              rows={3}
              required
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-600/30"
            >
              Set Cache Key
            </button>
          </form>

          {/* Get Key Lookup */}
          <div className="border-t border-border pt-4 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Get Cache Key</span>
            <div className="flex space-x-2">
              <input
                type="text"
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                placeholder="Enter key to lookup..."
                className="flex-1 rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleLookupCache}
                disabled={loading}
                className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-white hover:bg-muted/80"
              >
                Lookup
              </button>
            </div>

            {lookupResult && (
              <pre className="rounded-xl border border-border bg-background/60 p-3 font-mono text-xs text-purple-300">
                {JSON.stringify(lookupResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Section 2: Full-Text Search */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Full-Text Search Engine</h3>
              <p className="text-xs text-muted-foreground">Index documents and run lightning-fast text queries</p>
            </div>
          </div>

          {/* Index Doc Form */}
          <form onSubmit={handleIndexDoc} className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Index Document</span>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Document Title (e.g. Distributed Database Guide)"
              required
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Document content for full-text indexing..."
              rows={3}
              required
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30"
            >
              Index Document
            </button>
          </form>

          {/* Search Query Runner */}
          <div className="border-t border-border pt-4 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Query Search Index</span>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="flex-1 rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-background/50 p-3">
                    <h5 className="text-xs font-bold text-white">{item.title || item.id}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
