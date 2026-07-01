"use client";

import Link from "next/link";
import { FiBarChart2, FiChevronRight } from "react-icons/fi";
import type { PowerRankingTeam } from "./types";

type Props = {
  loaded: boolean;
  rankings: PowerRankingTeam[];
  hubLeagueId?: string | null;
};

export function PowerRankingsCard({ loaded, rankings, hubLeagueId }: Props) {
  return (
    <section className="hub-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <FiBarChart2 className="h-3.5 w-3.5 text-purple-400" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          Power Rankings
        </h2>
      </div>

      {!loaded ? (
        <div className="space-y-1.5 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-zinc-800/40" />
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500 italic">No rankings available yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rankings.slice(0, 5).map((team) => {
            const record =
              team.ties > 0
                ? `${team.wins}-${team.losses}-${team.ties}`
                : `${team.wins}-${team.losses}`;
            return (
              <li
                key={team.rank}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                  team.isMe
                    ? "border border-[#F4D06F]/20 bg-[#F4D06F]/5"
                    : "border border-transparent"
                }`}
              >
                <span
                  className={`w-4 shrink-0 text-center text-[11px] font-bold ${
                    team.rank === 1 ? "text-[#F4D06F]" : "text-gray-400 dark:text-zinc-500"
                  }`}
                >
                  {team.rank}
                </span>
                <p
                  className={`flex-1 text-xs font-medium truncate ${
                    team.isMe ? "text-[#F4D06F]" : "text-gray-300 dark:text-zinc-300"
                  }`}
                >
                  {team.displayName}
                </p>
                <span className="text-[10px] text-gray-300 dark:text-zinc-600">{record}</span>
                <span className="text-[10px] text-zinc-600">{team.pointsFor.toFixed(1)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {hubLeagueId && (
        <Link
          href={`/hub-league/${hubLeagueId}/power-rankings`}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-800/60 py-2 text-[11px] text-gray-300 dark:text-zinc-600 hover:border-zinc-700/60 hover:text-gray-500 dark:hover:text-zinc-400 transition"
        >
          Full Power Rankings <FiChevronRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}
