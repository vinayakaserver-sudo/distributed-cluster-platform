'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeSnippetProps {
  snippets: Record<string, string>;
  title?: string;
}

export function CodeSnippet({ snippets, title }: CodeSnippetProps) {
  const languages = Object.keys(snippets);
  const [activeLang, setActiveLang] = useState(languages[0] || 'javascript');
  const [copied, setCopied] = useState(false);

  const currentCode = snippets[activeLang] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden font-mono">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex items-center space-x-1">
          {title && <span className="mr-3 text-xs font-semibold text-muted-foreground font-sans uppercase">{title}</span>}
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                activeLang === lang
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs font-sans text-muted-foreground hover:bg-muted hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Block */}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-blue-300/90 bg-background/50">
        <code>{currentCode}</code>
      </pre>
    </div>
  );
}
