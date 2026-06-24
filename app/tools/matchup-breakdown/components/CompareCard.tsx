"use client";

import { FiX } from "react-icons/fi";

const POS_STYLE: Record<string, string> = {
  QB:  "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB:  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR:  "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE:  "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
  K:   "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
  DEF: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40",
};

export type ComparePlayer = {
  sleeperId: string;
  name: string;
  position: string;
  team: string;
  projectedPts: number;
  age: number | null;
  opponent?: string | null;
};

export function CompareCard({
  player,
  rank,
  maxPts,
  gapToFirst,
  onRemove,
}: {
  player: ComparePlayer;
  rank: number;
  maxPts: number;
  gapToFirst: number | null;
  onRemove: (id: string) => void;
}) {
  const isWinner = rank === 1;
  const pct = maxPts > 0 ? Math.round((player.projectedPts / maxPts) * 100) : 0;
  const posClass = POS_STYLE[player.position] ?? POS_STYLE["DEF"];

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 ${
        isWinner
          ? "border-amber-400/50 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 shadow-sm shadow-amber-500/10"
          : "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20"
      }`}
    >
      {isWinner && (
        <div className="absolute -top-px left-5 h-0.5 w-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 dark:from-[#F4D06F] dark:to-amber-400" />
      )}

      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-extrabold tabular-nums ${
            isWinner
              ? "border-amber-400/60 bg-amber-400/15 text-amber-600 dark:text-amber-400"
              : "border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500"
          }`}>
            {rank}
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold ${posClass}`}>
                {player.position}
              </span>
              <h3 className={`text-base font-extrabold tracking-tight truncate ${
                isWinner ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"
              }`}>
                {player.name}
              </h3>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {player.team || "FA"}
              {player.age ? ` · Age ${Math.floor(player.age)}` : ""}
            </p>
          </div>

          {/* Projected pts + badge */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              isWinner
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400"
            }`}>
              {isWinner ? "START" : "SIT"}
            </span>
            <div className="text-right">
              <span className={`text-lg font-extrabold tabular-nums leading-tight ${
                isWinner ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"
              }`}>
                {player.projectedPts > 0 ? player.projectedPts.toFixed(1) : "—"}
              </span>
              {player.projectedPts > 0 && (
                <p className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wide">proj pts</p>
              )}
            </div>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(player.sleeperId)}
            className="shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Value bar */}
        {player.projectedPts > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isWinner
                    ? "bg-gradient-to-r from-amber-400 to-amber-300 dark:from-[#F4D06F] dark:to-amber-400"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">{pct}%</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {isWinner && player.projectedPts > 0 && gapToFirst === null && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-600">Best projected option</span>
          )}
          {!isWinner && gapToFirst !== null && gapToFirst > 0 && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-600">
              − {gapToFirst.toFixed(1)} pts behind #1
            </span>
          )}
          {!isWinner && gapToFirst === 0 && (
            <span className="text-[10px] text-amber-500">Tied with #1</span>
          )}
          {player.projectedPts === 0 && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">No projection available this week</span>
          )}
        </div>
      </div>
    </div>
  );
}
