"use client";

import { FiPlus } from "react-icons/fi";
import type { SelectedPlayer } from "../types";
import { POSITION_COLOR } from "../constants";

export function TradeBalancer({ gap, sideLabel, candidates, onAdd }: {
  gap: number;
  sideLabel: string;
  candidates: SelectedPlayer[];
  onAdd: (p: SelectedPlayer) => void;
}) {
  if (candidates.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">Balance the Trade</span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Adding one of these to {sideLabel} would close the {gap.toLocaleString()} value gap:
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {candidates.map((c) => {
          const posClass = POSITION_COLOR[c.position] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
          return (
            <button
              key={c.sleeperId}
              onClick={() => onAdd(c)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 pl-2 pr-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
            >
              <FiPlus className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span className={`rounded-full border px-1.5 py-px text-[8px] font-semibold ${posClass}`}>
                {c.position}
              </span>
              <span className="truncate max-w-[140px]">{c.name}</span>
              <span className="text-zinc-500 dark:text-zinc-500 font-bold">{c.value.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
