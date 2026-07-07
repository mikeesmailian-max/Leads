"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      >
        <Search className="h-3.5 w-3.5" />
        Search everything…
        <kbd className="ml-auto rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-900">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 pt-24" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts, contacts, lanes, tasks, load #…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          <button onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto py-1">
          {results.length === 0 && query.trim().length >= 2 && !loading && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No results for “{query}”.</p>
          )}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => {
                setOpen(false);
                setQuery("");
                router.push(r.href);
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                {r.subtitle && <span className="ml-2 text-slate-400">{r.subtitle}</span>}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
                {r.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
