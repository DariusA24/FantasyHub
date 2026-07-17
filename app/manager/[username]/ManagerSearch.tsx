'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiStar } from 'react-icons/fi';

type ManagerResult = {
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  hasSleeperLink: boolean;
};

export default function ManagerSearch() {
  const router = useRouter();
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState<ManagerResult[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/managers/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } finally { setLoading(false); }
    }, 250);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  const handleSelect = (r: ManagerResult) => {
    setQuery(''); setResults([]); setOpen(false);
    router.push(`/manager/${r.username}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1)); }
    if (e.key === 'Enter' && highlighted >= 0) handleSelect(results[highlighted]);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <FiSearch className="absolute left-3 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search managers…"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 pl-8 pr-3 py-2.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 dark:focus:border-amber-500/40 transition-colors"
        />
        {loading && (
          <span className="absolute right-3 h-3 w-3 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-amber-500 dark:border-t-amber-400 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500 italic">No managers found.</p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.username}>
                  <button
                    onMouseDown={() => handleSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      i === highlighted ? 'bg-zinc-100 dark:bg-zinc-800/70' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.profileImage || '/default-profile.png'}
                      alt={r.username}
                      className="h-7 w-7 shrink-0 rounded-full object-cover border border-zinc-200 dark:border-zinc-700/60"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">@{r.username}</p>
                    </div>
                    {r.hasSleeperLink && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-px text-[9px] font-semibold text-amber-600 dark:text-[#F4D06F]">
                        <FiStar className="h-2.5 w-2.5" />
                        Sleeper
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
