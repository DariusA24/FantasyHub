"use client";

import type { SleeperRoster, PlayerInfo, ValueMap } from "../types";
import { POSITION_COLOR, KEY_POSITIONS, FLEX_MAP } from "../constants";

export function TeamNeeds({ label, roster, infoMap, valueMap, starterCounts, accent }: {
  label: string;
  roster: SleeperRoster | null;
  infoMap: Record<string, PlayerInfo>;
  valueMap: ValueMap;
  starterCounts: Record<string, number>;
  accent: "amber" | "blue";
}) {
  if (!roster) return null;

  const byPosition: Record<string, number[]> = {};
  for (const id of roster.players ?? []) {
    const pos = infoMap[id]?.position ?? "";
    if (!KEY_POSITIONS.includes(pos)) continue;
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(valueMap[id]?.value ?? 0);
  }
  for (const pos of KEY_POSITIONS) {
    byPosition[pos] = (byPosition[pos] ?? []).sort((a, b) => b - a);
  }

  const used: Record<string, number> = {};
  const flexSlots: string[][] = [];
  for (const pos of KEY_POSITIONS) {
    used[pos] = Math.min(byPosition[pos].length, starterCounts[pos] ?? 0);
  }
  for (const [flexType, eligible] of Object.entries(FLEX_MAP)) {
    const flexCount = starterCounts[flexType] ?? 0;
    for (let i = 0; i < flexCount; i++) flexSlots.push(eligible);
  }

  const remaining: Record<string, number[]> = {};
  for (const pos of KEY_POSITIONS) remaining[pos] = byPosition[pos].slice(used[pos]);

  const flexValues: number[] = [];
  for (const eligible of flexSlots) {
    let best = 0;
    let bestPos = "";
    for (const pos of eligible) {
      const top = remaining[pos]?.[0] ?? 0;
      if (top > best) { best = top; bestPos = pos; }
    }
    flexValues.push(best);
    if (bestPos) remaining[bestPos] = remaining[bestPos].slice(1);
  }

  const needs = KEY_POSITIONS
    .filter((pos) => (starterCounts[pos] ?? 0) > 0)
    .map((pos) => {
      const slots    = starterCounts[pos];
      const starters = byPosition[pos].slice(0, slots);
      const avg      = starters.reduce((s, v) => s + v, 0) / slots;
      return { position: pos, avg, slots, starterValues: starters };
    });

  const totalFlexSlots = flexSlots.length;
  if (totalFlexSlots > 0) {
    const flexAvg = flexValues.reduce((s, v) => s + v, 0) / totalFlexSlots;
    needs.push({ position: "FLEX", avg: flexAvg, slots: totalFlexSlots, starterValues: flexValues });
  }

  needs.sort((a, b) => a.avg - b.avg);

  const headerColor = accent === "amber"
    ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
    : "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";

  const needColors = ["text-red-500 dark:text-red-400", "text-orange-500 dark:text-orange-400", "text-yellow-600 dark:text-yellow-500", "text-zinc-500 dark:text-zinc-400", "text-zinc-500 dark:text-zinc-500"];
  const barMax = needs[needs.length - 1]?.avg ?? 1;

  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">{label} — Needs</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${headerColor}`}>
          Starter Quality
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        {needs.map((n, i) => {
          const posClass  = POSITION_COLOR[n.position] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
          const rankColor = needColors[i] ?? "text-zinc-500";
          const pct = barMax > 0 ? Math.round((n.avg / barMax) * 100) : 0;
          return (
            <div key={n.position} className="flex items-center gap-3">
              <span className={`text-[10px] font-bold w-4 shrink-0 ${rankColor}`}>#{i + 1}</span>
              <span className={`shrink-0 rounded-full border px-2 py-px text-[9px] font-semibold ${posClass}`}>
                {n.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      accent === "amber" ? "bg-amber-500/50" : "bg-blue-500/50"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{Math.round(n.avg).toLocaleString()}</span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-600 ml-1">avg/{n.slots}st</span>
              </div>
            </div>
          );
        })}
        <p className="text-[9px] text-zinc-500 dark:text-zinc-600 mt-1">
          Avg dynasty value per starter slot · missing starters count as 0
        </p>
      </div>
    </div>
  );
}
