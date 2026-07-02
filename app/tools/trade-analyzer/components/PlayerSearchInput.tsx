"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import type { SelectedPlayer, SearchResult, ValueMap } from "../types";
import { POSITION_COLOR } from "../constants";

export function PlayerSearchInput({ valueMap, excluded, onAdd, placeholder }: {
  valueMap: ValueMap;
  excluded: string[];
  onAdd: (p: SelectedPlayer) => void;
  placeholder?: string;
}) {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/sleeper/players/search?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } finally { setLoading(false); }
    }, 250);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  const handleSelect = (r: SearchResult) => {
    const val = valueMap[r.id];
    onAdd({
      sleeperId: r.id,
      name: r.full_name ?? r.id,
      position: r.position ?? "",
      team: r.team ?? "",
      value: val?.value ?? 0,
      trend: val?.trend ?? 0,
      redraftValue: val?.redraftValue ?? 0,
      age: val?.age ?? null,
      tier: val?.tier ?? null,
    });
    setQuery(""); setResults([]); setOpen(false);
  };

  const handleSelectPick = (id: string) => {
    const val = valueMap[id];
    if (!val) return;
    onAdd({ sleeperId: id, name: val.name, position: "PICK", team: "", value: val.value, trend: val.trend, redraftValue: 0, age: null, tier: val.tier });
    setQuery(""); setResults([]); setOpen(false);
  };

  const pickMatches = query.length >= 1
    ? Object.entries(valueMap)
        .filter(([id, v]) => v.position === "PICK" && v.name.toLowerCase().includes(query.toLowerCase()) && !excluded.includes(id))
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 6)
    : [];

  const filtered = results.filter((r) => !excluded.includes(r.id));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1)); }
    if (e.key === "Enter" && highlighted >= 0) handleSelect(filtered[highlighted]);
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <FiSearch className="absolute left-3 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => filtered.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search players…"}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 pl-8 pr-3 py-2.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 dark:focus:border-amber-500/40 transition-colors"
        />
        {loading && (
          <span className="absolute right-3 h-3 w-3 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-amber-500 dark:border-t-amber-400 animate-spin" />
        )}
      </div>

      {open && (filtered.length > 0 || pickMatches.length > 0) && (
        <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          <ul>
            {filtered.map((r, i) => {
              const val = valueMap[r.id];
              const posClass = POSITION_COLOR[r.position ?? ""] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
              return (
                <li key={r.id}>
                  <button
                    onMouseDown={() => handleSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      i === highlighted ? "bg-zinc-100 dark:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.full_name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {r.team ?? "FA"}{val?.age ? ` · Age ${Math.floor(val.age)}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold ${posClass}`}>
                      {r.position}
                    </span>
                    {val && (
                      <span className="shrink-0 text-xs font-bold text-zinc-700 dark:text-zinc-300">{val.value.toLocaleString()}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {pickMatches.length > 0 && (
            <>
              {filtered.length > 0 && <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800/60" />}
              <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Picks</p>
              <ul>
                {pickMatches.map(([id, v]) => (
                  <li key={id}>
                    <button
                      onMouseDown={() => handleSelectPick(id)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <span className="shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold text-amber-600 dark:text-[#F4D06F] bg-amber-500/10 border-amber-400/30">
                        PICK
                      </span>
                      <p className="flex-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">{v.name}</p>
                      <span className="shrink-0 text-xs font-bold text-zinc-700 dark:text-zinc-300">{v.value.toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
