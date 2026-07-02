"use client";

import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { TeamData } from "../types";
import { KEY_POSITIONS, POS_TEXT } from "../types";

const RANK_LABEL: Record<number, string> = {
  1: "text-amber-500 dark:text-amber-400",
  2: "text-zinc-500 dark:text-zinc-300",
  3: "text-orange-500",
};

export function TeamTable({ teams, isDynasty }: { teams: TeamData[]; isDynasty: boolean }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (rosterId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(rosterId) ? next.delete(rosterId) : next.add(rosterId);
      return next;
    });

  const gridCols = isDynasty
    ? "grid-cols-[36px_1fr_80px_56px_56px_56px_56px_60px_28px]"
    : "grid-cols-[36px_1fr_80px_56px_56px_56px_56px_28px]";

  const headers = isDynasty
    ? ["#", "Team", "Total", "QB", "RB", "WR", "TE", "Picks", ""]
    : ["#", "Team", "Total", "QB", "RB", "WR", "TE", ""];

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      <div className={`grid ${gridCols} gap-x-2 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40`}>
        {headers.map((h, i) => (
          <span key={i} className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-600">
            {h}
          </span>
        ))}
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800/40">
        {teams.map((team) => {
          const isOpen   = expanded.has(team.rosterId);
          const lblColor = RANK_LABEL[team.overallRank] ?? "text-zinc-500 dark:text-zinc-600";

          return (
            <div key={team.rosterId}>
              <button
                onClick={() => toggle(team.rosterId)}
                className={`w-full grid ${gridCols} gap-x-2 px-4 py-3 items-center hover:bg-zinc-100 dark:hover:bg-zinc-800/20 transition-colors text-left`}
              >
                <span className={`text-[12px] font-bold ${lblColor}`}>#{team.overallRank}</span>

                <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {team.displayName}
                </p>

                <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {team.totalValue.toLocaleString()}
                </span>

                {KEY_POSITIONS.map((pos) => (
                  <div key={pos} className="text-center">
                    <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {(team.posValues[pos] ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-600">#{team.posRanks[pos]}</p>
                  </div>
                ))}

                {isDynasty && (
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-[#F4D06F]/80 tabular-nums">
                      {team.picksValue.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-600">#{team.picksRank}</p>
                  </div>
                )}

                <FiChevronDown className={`h-3.5 w-3.5 text-zinc-500 dark:text-zinc-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-zinc-200 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/30">
                  <div className="grid grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800/20 m-3 rounded-xl overflow-hidden">

                    {isDynasty && team.picks.length > 0 && (
                      <div className="col-span-2 bg-white dark:bg-zinc-900/70 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="rounded-full border px-2 py-px text-[9px] font-bold text-amber-600 dark:text-[#F4D06F] bg-amber-500/10 border-amber-400/30">
                            PICKS
                          </span>
                          <span className="text-[10px] text-zinc-500">#{team.picksRank} in league</span>
                          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 ml-auto tabular-nums">
                            {team.picksValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {team.picks.map((p) => (
                            <div key={p.key} className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{p.name}</span>
                              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                {p.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {KEY_POSITIONS.map((pos) => {
                      const players  = team.topByPos[pos] ?? [];
                      const posStyle = POS_TEXT[pos];
                      const total    = team.posValues[pos] ?? 0;
                      const rank     = team.posRanks[pos];

                      return (
                        <div key={pos} className="bg-white dark:bg-zinc-900/70 px-4 py-3">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className={`rounded-full border px-2 py-px text-[9px] font-bold ${posStyle}`}>{pos}</span>
                            <span className="text-[10px] text-zinc-500">#{rank} in league</span>
                            <span className="ml-auto text-[12px] font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                              {total.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {players.length > 0 ? (
                              players.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold text-zinc-500 w-8 shrink-0 tabular-nums">{pos}{p.posRank}</span>
                                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex-1 truncate">{p.name}</span>
                                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{p.value.toLocaleString()}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-700 italic">No {pos}s on roster</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
