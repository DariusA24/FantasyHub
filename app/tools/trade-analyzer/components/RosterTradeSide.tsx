"use client";

import type { SleeperRoster, SleeperPick, PlayerInfo, ValueMap } from "../types";
import { pickKey, pickFcId, pickToSelectedPlayer, rosterPlayerToSelectedPlayer } from "../helpers";
import { RosterCard } from "./RosterCard";

export function RosterTradeSide({
  label, roster, picks, infoMap, valueMap, selectedIds,
  onTogglePlayer, onTogglePick, accent, emptyMessage,
}: {
  label: string;
  roster: SleeperRoster | null;
  picks: SleeperPick[];
  infoMap: Record<string, PlayerInfo>;
  valueMap: ValueMap;
  selectedIds: Set<string>;
  onTogglePlayer: (playerId: string) => void;
  onTogglePick: (pick: SleeperPick) => void;
  accent: "amber" | "blue";
  emptyMessage?: string;
}) {
  const accentBadge = accent === "amber"
    ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
    : "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";

  const players = (roster?.players ?? [])
    .map((id) => rosterPlayerToSelectedPlayer(id, infoMap, valueMap))
    .sort((a, b) => b.value - a.value);

  const selectedTotal = [...(roster?.players ?? []), ...picks.map((p) => pickKey(p))]
    .filter((id) => selectedIds.has(id))
    .reduce((sum, id) => {
      const pick = picks.find((p) => pickKey(p) === id);
      if (pick) {
        const val = valueMap[pickFcId(pick)];
        return sum + (val?.value ?? 0);
      }
      return sum + (valueMap[id]?.value ?? 0);
    }, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">{label}</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${accentBadge}`}>
          {selectedTotal.toLocaleString()}
        </span>
      </div>

      {roster && (
        <div className="flex flex-col gap-1 h-[500px] overflow-y-auto px-3 py-2">
          {players.map((p) => (
            <RosterCard
              key={p.sleeperId}
              player={p}
              selected={selectedIds.has(p.sleeperId)}
              accent={accent}
              onToggle={() => onTogglePlayer(p.sleeperId)}
            />
          ))}

          {picks.length > 0 && (
            <>
              <p className="px-1 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">
                Picks
              </p>
              {picks.map((pick) => {
                const sp  = pickToSelectedPlayer(pick, valueMap);
                const key = pickKey(pick);
                return (
                  <RosterCard
                    key={key}
                    player={{ ...sp, sleeperId: key }}
                    selected={selectedIds.has(key)}
                    accent={accent}
                    onToggle={() => onTogglePick(pick)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {!roster && (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-600">{emptyMessage ?? "Loading…"}</p>
        </div>
      )}
    </div>
  );
}
