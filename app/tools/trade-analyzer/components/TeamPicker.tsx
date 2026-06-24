"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FiChevronDown } from "react-icons/fi";
import type { LeagueTeam } from "../types";

export function TeamPicker({ teams, selectedRosterId, onSelect }: {
  teams: LeagueTeam[];
  selectedRosterId: number | null;
  onSelect: (rosterId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = teams.find((t) => t.roster.roster_id === selectedRosterId);

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
        className="w-full flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        {selected?.user ? (
          <>
            {selected.user.avatar ? (
              <Image
                src={`https://sleepercdn.com/avatars/thumbs/${selected.user.avatar}`}
                alt={selected.user.display_name} width={20} height={20}
                className="h-5 w-5 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover shrink-0"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold text-blue-500 dark:text-blue-400 shrink-0">
                {selected.user.display_name[0]?.toUpperCase()}
              </div>
            )}
            <span className="flex-1 text-left truncate font-semibold text-zinc-900 dark:text-zinc-100">
              {selected.user.display_name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-left text-zinc-500">Select a team…</span>
        )}
        <FiChevronDown className={`h-3.5 w-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          {teams.map((t) => (
            <button
              key={t.roster.roster_id}
              onMouseDown={() => { onSelect(t.roster.roster_id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors"
            >
              {t.user?.avatar ? (
                <Image
                  src={`https://sleepercdn.com/avatars/thumbs/${t.user.avatar}`}
                  alt={t.user.display_name} width={24} height={24}
                  className="h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover shrink-0"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                  {t.user?.display_name[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {t.user?.display_name ?? `Team ${t.roster.roster_id}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
