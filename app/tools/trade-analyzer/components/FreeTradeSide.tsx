"use client";

import type { SelectedPlayer, ValueMap } from "../types";
import { PlayerCard } from "./PlayerCard";
import { PlayerSearchInput } from "./PlayerSearchInput";

export function FreeTradeSide({ label, players, rawTotal, waiverAdj, isDynasty, valueMap, excluded, onAdd, onRemove, accent }: {
  label: string;
  players: SelectedPlayer[];
  rawTotal: number;
  waiverAdj: number;
  isDynasty: boolean;
  valueMap: ValueMap;
  excluded: string[];
  onAdd: (p: SelectedPlayer) => void;
  onRemove: (id: string) => void;
  accent: "blue" | "amber";
}) {
  const accentClass = accent === "blue"
    ? "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10"
    : "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
  const adjustedTotal = rawTotal + waiverAdj;

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">{label}</h2>
        <div className="flex items-center gap-1.5">
          {waiverAdj > 0 && (
            <span className="text-[10px] text-zinc-500" title="Waiver adjustment — this side sends fewer players, so the other team refills its open roster spots from waivers">
              {rawTotal.toLocaleString()} <span className="text-emerald-500">+{waiverAdj.toLocaleString()} waiver</span>
            </span>
          )}
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${accentClass}`}>
            {adjustedTotal.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-h-[60px]">
        {players.map((p) => (
          <PlayerCard
            key={p.sleeperId}
            player={p}
            isDynasty={isDynasty}
            onRemove={() => onRemove(p.sleeperId)}
          />
        ))}
        {players.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800/60 py-6 text-center">
            <p className="text-[11px] text-zinc-600">Add players to this side</p>
          </div>
        )}
      </div>

      <PlayerSearchInput valueMap={valueMap} excluded={excluded} onAdd={onAdd} placeholder="Add a player…" />
    </div>
  );
}
