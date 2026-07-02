"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronRight, FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";

const playerThumb = (id: string) =>
  `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;

const POSITIONS = ["QB", "RB", "WR", "TE"] as const;
type Position = typeof POSITIONS[number];

const POS_COLOR: Record<Position, string> = {
  QB: "text-red-400 border-red-500/30 bg-red-500/10",
  RB: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  WR: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  TE: "text-orange-400 border-orange-500/30 bg-orange-500/10",
};

const POS_ACCENT: Record<Position, string> = {
  QB: "text-red-400",
  RB: "text-emerald-400",
  WR: "text-blue-400",
  TE: "text-orange-400",
};

type SleeperPlayer = {
  player_id: string;
  full_name?: string | null;
  position?: string | null;
  team?: string | null;
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
};

type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string } | null;
};

type DynastyEntry = {
  positionRank: number;
  overallRank: number;
  value: number;
  trend30Day: number;
} | null;

type LeaderboardRow = {
  playerId: string;
  player: SleeperPlayer | undefined;
  dynasty: DynastyEntry;
  ownerName: string;
  isMe: boolean;
};

type Props = {
  allRosters: SleeperRoster[];
  player: Record<string, SleeperPlayer>;
  dynastyMap: Record<string, DynastyEntry>;
  leagueUsers: SleeperLeagueUser[];
  myOwnerId: string | null;
};

export function DynastyLeaderboard({ allRosters, player, dynastyMap, leagueUsers, myOwnerId }: Props) {
  const [openPositions, setOpenPositions] = useState<Set<Position>>(new Set(["QB"]));

  const userMap = new Map(leagueUsers.map((u) => [u.user_id, u]));

  // Build owner map: playerId -> { ownerName, isMe }
  const ownerByPlayer = new Map<string, { ownerName: string; isMe: boolean }>();
  for (const roster of allRosters) {
    const user = userMap.get(roster.owner_id);
    const ownerName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
    const isMe = roster.owner_id === myOwnerId;
    for (const pid of roster.players ?? []) {
      ownerByPlayer.set(pid, { ownerName, isMe });
    }
  }

  // Group all players by position, sorted by dynasty value desc
  const byPosition: Record<Position, LeaderboardRow[]> = { QB: [], RB: [], WR: [], TE: [] };

  const allPlayerIds = Array.from(new Set(allRosters.flatMap((r) => r.players ?? [])));
  for (const pid of allPlayerIds) {
    const p = player[pid];
    const pos = p?.position as Position | undefined;
    if (!pos || !POSITIONS.includes(pos)) continue;

    const dynasty = dynastyMap[pid] ?? null;
    const owner = ownerByPlayer.get(pid);

    byPosition[pos].push({
      playerId: pid,
      player: p,
      dynasty,
      ownerName: owner?.ownerName ?? "—",
      isMe: owner?.isMe ?? false,
    });
  }

  // Sort each position by dynasty value desc; unranked players go to the bottom
  for (const pos of POSITIONS) {
    byPosition[pos].sort((a, b) => (b.dynasty?.value ?? -1) - (a.dynasty?.value ?? -1));
  }

  function togglePosition(pos: Position) {
    setOpenPositions((prev) => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">Dynasty Rankings</span>
        <span className="rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-500">
          All teams · FantasyCalc
        </span>
      </div>

      <div className="space-y-2">
        {POSITIONS.map((pos) => {
          const rows = byPosition[pos];
          const isOpen = openPositions.has(pos);
          const accent = POS_ACCENT[pos];
          const badge = POS_COLOR[pos];

          return (
            <div key={pos} className="hub-card overflow-hidden">
              {/* Position header — always visible, click to toggle */}
              <button
                onClick={() => togglePosition(pos)}
                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition"
              >
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                  {pos}
                </span>
                <span className={`text-sm font-semibold ${accent}`}>{pos}s</span>
                <span className="text-[11px] text-zinc-600">{rows.length} players</span>
                {rows[0]?.dynasty && (
                  <span className="ml-auto text-[10px] text-zinc-600 mr-1">
                    Top: {rows[0].player?.full_name?.split(" ").pop()} · {rows[0].dynasty.value.toLocaleString()}
                  </span>
                )}
                {isOpen
                  ? <FiChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  : <FiChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                }
              </button>

              {/* Expanded list */}
              {isOpen && (
                <div className="border-t border-zinc-800/60">
                  {/* Column headers */}
                  <div className="grid grid-cols-[28px_24px_1fr_72px_56px_80px] gap-x-3 px-4 py-1.5 text-[9px] uppercase tracking-widest text-zinc-600">
                    <span />
                    <span className="text-center">#</span>
                    <span>Player</span>
                    <span className="text-right">Value</span>
                    <span className="text-right">30d</span>
                    <span className="text-right">Owner</span>
                  </div>

                  <ul className="divide-y divide-zinc-800/40">
                    {rows.map((row, i) => {
                      const trend = row.dynasty?.trend30Day ?? 0;
                      const trendUp = trend > 0;
                      const trendFlat = trend === 0;
                      const trendColor = trendUp ? "text-emerald-400" : trendFlat ? "text-zinc-600" : "text-red-400";
                      const trendLabel = trendFlat ? "—" : `${trendUp ? "+" : ""}${trend}`;

                      return (
                        <li
                          key={row.playerId}
                          className={`grid grid-cols-[28px_24px_1fr_72px_56px_80px] items-center gap-x-3 px-4 py-2 transition-colors ${
                            row.isMe ? "bg-[#F4D06F]/5" : "hover:bg-zinc-800/20"
                          }`}
                        >
                          {/* Avatar */}
                          <img
                            src={playerThumb(row.playerId)}
                            alt={row.player?.full_name ?? row.playerId}
                            className="h-7 w-7 rounded-full object-cover bg-zinc-800 border border-zinc-700/60 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
                          />

                          {/* Position rank */}
                          <span className={`text-center text-[11px] font-bold ${i === 0 ? "text-[#F4D06F]" : "text-zinc-500"}`}>
                            {i + 1}
                          </span>

                          {/* Name + team */}
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${row.isMe ? "text-[#F4D06F]" : "text-zinc-200"}`}>
                              {row.player?.full_name ?? row.playerId}
                            </p>
                            <p className="text-[10px] text-zinc-600 truncate">
                              {row.player?.team ?? "FA"}
                            </p>
                          </div>

                          {/* Dynasty value */}
                          <p className="text-right text-xs font-bold text-zinc-100">
                            {row.dynasty ? row.dynasty.value.toLocaleString() : <span className="text-zinc-700">—</span>}
                          </p>

                          {/* 30d trend */}
                          <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${trendColor}`}>
                            {!trendFlat && (trendUp
                              ? <FiTrendingUp className="h-3 w-3 shrink-0" />
                              : <FiTrendingDown className="h-3 w-3 shrink-0" />
                            )}
                            {trendFlat && <FiMinus className="h-3 w-3 shrink-0 text-zinc-700" />}
                            {!trendFlat && <span>{trendLabel}</span>}
                          </div>

                          {/* Owner */}
                          <p className={`text-right text-[10px] truncate ${row.isMe ? "text-[#F4D06F]/70" : "text-zinc-600"}`}>
                            {row.ownerName}
                          </p>
                        </li>
                      );
                    })}

                    {rows.length === 0 && (
                      <li className="px-4 py-4 text-center text-xs text-zinc-600 italic">
                        No {pos}s on any roster.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
