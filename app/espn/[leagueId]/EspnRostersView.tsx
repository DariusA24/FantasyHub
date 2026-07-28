"use client";

import { useState } from "react";
import { SLOT_MAP, POS_COLORS } from "./espnConstants";
import { PlayerStatsModal } from "@/components/player/PlayerStatsModal";
import type { SleeperPlayer } from "@/app/hub-league/[hubLeagueId]/roster/page";

type Player = {
  espnId: number;
  name: string;
  pos: string;
  slotId: number;
  sleeperId: string | null;
  team: string | null;
};
type Team = {
  id: number;
  name: string;
  abbrev: string;
  wins: number;
  losses: number;
  pf: number;
  roster: Player[];
};

const espnHeadshot = (id: number) => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

// Lineup order to match the hub roster: QB, RB, WR, TE, FLEX, K, D/ST.
const SLOT_ORDER: Record<number, number> = {
  0: 0,        // QB
  2: 1,        // RB
  4: 2,        // WR
  6: 3,        // TE
  23: 4, 24: 4, // FLEX
  17: 5,       // K
  16: 6,       // D/ST
};

function PlayerRow({
  p, slotLabel, onOpen,
}: {
  p: Player;
  slotLabel: string;
  onOpen: (p: Player) => void;
}) {
  const clickable = !!p.sleeperId;
  return (
    <li
      onClick={clickable ? () => onOpen(p) : undefined}
      className={`flex items-center gap-2.5 py-2 ${clickable ? "cursor-pointer -mx-2 rounded-lg px-2 hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-colors" : ""}`}
    >
      <img
        src={espnHeadshot(p.espnId)}
        alt={p.name}
        className="h-9 w-9 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60"
        onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
      />
      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold w-11 text-center ${POS_COLORS[slotLabel] ?? POS_COLORS[p.pos] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
        {slotLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">{p.name}</p>
        <p className="text-[11px]">
          {p.pos && <span className={`mr-1.5 font-bold ${POS_COLORS[p.pos] ?? "text-zinc-400"}`}>{p.pos}</span>}
          {p.team && <span className="text-zinc-500">{p.team}</span>}
        </p>
      </div>
    </li>
  );
}

export default function EspnRostersView({ teams, myTeamId }: { teams: Team[]; myTeamId?: number | null }) {
  const [selectedId, setSelectedId] = useState<number | null>(myTeamId ?? teams[0]?.id ?? null);
  const [modalPlayer, setModalPlayer] = useState<SleeperPlayer | null>(null);
  const selected = teams.find((t) => t.id === selectedId) ?? teams[0];

  function openPlayer(p: Player) {
    if (!p.sleeperId) return;
    setModalPlayer({ player_id: p.sleeperId, full_name: p.name, position: p.pos, team: p.team });
  }

  if (!selected) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No teams found for this league.</p>;
  }

  const starters = selected.roster
    .filter((p) => p.slotId !== 20 && p.slotId !== 21)
    .sort((a, b) => (SLOT_ORDER[a.slotId] ?? 99) - (SLOT_ORDER[b.slotId] ?? 99));
  const bench    = selected.roster.filter((p) => p.slotId === 20);
  const ir       = selected.roster.filter((p) => p.slotId === 21);

  return (
    <>
      {/* ─── Team picker ─── */}
      {teams.length > 1 && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">League Rosters</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {teams.map((t) => {
              const isSelected = t.id === selected.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? "border-red-500/50 bg-red-500/10"
                      : "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-black text-red-600 dark:text-red-400">
                    {t.abbrev.slice(0, 3) || t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate max-w-[120px] text-xs font-semibold ${isSelected ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                      {t.name}
                      {t.id === myTeamId && <span className="ml-1 text-[9px] text-red-500 dark:text-red-400">(you)</span>}
                    </p>
                    <p className="text-[10px] text-zinc-500">{t.wins}–{t.losses}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Selected team header ─── */}
      <div className="mb-5 hub-card px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selected.name}</span>
        <span className="text-xs text-zinc-500">{selected.wins}–{selected.losses}</span>
        <span className="text-xs text-zinc-500">{selected.pf.toFixed(1)} PF</span>
        <span className="ml-auto text-[10px] text-zinc-400">{selected.roster.length} players</span>
      </div>

      {/* ─── Starters + Bench ─── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="hub-card shadow-[0_0_25px_rgba(0,0,0,0.6)] p-4 md:p-5 mb-10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#F4D06F]">Starters</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Active lineup.</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-300 border border-emerald-500/40">
              {starters.length} active
            </span>
          </div>
          {starters.length > 0 ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {starters.map((p, i) => (
                <PlayerRow key={i} p={p} slotLabel={SLOT_MAP[p.slotId] ?? p.pos} onOpen={openPlayer} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">No starters found.</p>
          )}
        </section>

        <section className="hub-card shadow-[0_0_18px_rgba(0,0,0,0.5)] p-4 md:p-5 mb-10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Bench</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Depth and reserves.</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700/40 text-gray-800 dark:text-zinc-200 border border-zinc-600/60">
              {bench.length} players
            </span>
          </div>
          {bench.length > 0 ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {bench.map((p, i) => (
                <PlayerRow key={i} p={p} slotLabel="BN" onOpen={openPlayer} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">No bench players.</p>
          )}
          {ir.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">Injured Reserve</p>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                {ir.map((p, i) => (
                  <PlayerRow key={i} p={p} slotLabel="IR" onOpen={openPlayer} />
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <PlayerStatsModal
        open={modalPlayer !== null}
        player={modalPlayer}
        isSuperFlex={false}
        onClose={() => setModalPlayer(null)}
      />
    </>
  );
}
