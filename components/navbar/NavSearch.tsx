'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiUser, FiX } from 'react-icons/fi';

type PlayerResult = {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
};

const POSITION_COLOR: Record<string, string> = {
  QB: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30',
  RB: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  WR: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
  TE: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30',
  K:  'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export default function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sleeper/players/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = (id: string) => {
    router.push(`/player/${id}`);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1)); }
    if (e.key === 'Enter' && highlighted >= 0) { navigate(results[highlighted].id); }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <FiSearch className="absolute left-3 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search players…"
          className="h-8 w-44 rounded-full border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 pl-8 pr-7 text-[12px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:w-56 transition-all duration-200"
        />
        {loading && (
          <span className="absolute right-3 h-3 w-3 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-amber-500 dark:border-t-amber-400 animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 flex items-center justify-center h-4 w-4 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <FiX className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          <ul>
            {results.map((p, i) => {
              const posClass = POSITION_COLOR[p.position ?? ''] ?? 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40';
              return (
                <li key={p.id}>
                  <button
                    onMouseDown={() => navigate(p.id)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === highlighted ? 'bg-zinc-100 dark:bg-zinc-800/70' : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40'}`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50">
                      <FiUser className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.full_name ?? '—'}</p>
                      <p className="text-[10px] text-zinc-500">{p.team ?? 'FA'}</p>
                    </div>
                    {p.position && (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${posClass}`}>
                        {p.position}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}