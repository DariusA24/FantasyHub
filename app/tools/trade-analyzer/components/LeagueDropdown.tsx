"use client";

import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { League } from "../types";

export function LeagueDropdown({ leagues, selected, onSelect }: {
  leagues: League[];
  selected: League | null;
  onSelect: (l: League | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors sm:min-w-[200px]"
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : "All players (no league)"}
        </span>
        <FiChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full sm:w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          <button
            onMouseDown={() => { onSelect(null); setOpen(false); }}
            className="w-full text-left rounded-xl px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            All players (no league)
          </button>
          {leagues.length > 0 && <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800/60" />}
          {leagues.map((l) => (
            <button
              key={l.id}
              onMouseDown={() => { onSelect(l); setOpen(false); }}
              className="w-full text-left rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{l.name}</p>
              {l.latestSeason && (
                <p className="text-[10px] text-zinc-500">{l.latestSeason.season} season</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
