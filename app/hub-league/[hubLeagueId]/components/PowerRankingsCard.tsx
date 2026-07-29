"use client";

import { FiBarChart2, FiChevronRight } from "react-icons/fi";
import type { PowerRankingTeam } from "./types";

type Props = {
  loaded: boolean;
  rankings: PowerRankingTeam[];
  onViewFull?: () => void;
};

export function PowerRankingsCard({ loaded, rankings, onViewFull }: Props) {
  return (
    <section className="hub-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <FiBarChart2 className="h-3.5 w-3.5 text-[var(--leather)]" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-2)]">
          Power Rankings
        </h2>
      </div>

      {!loaded ? (
        <div className="space-y-1.5 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-[var(--card-2)]" />
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <p className="py-4 text-center text-xs text-[var(--ink-3)] italic">No rankings available yet.</p>
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
                    ? "border border-[var(--gold)]/40 bg-[var(--gold-bright)]/10"
                    : "border border-transparent"
                }`}
              >
                <span
                  className={`w-4 shrink-0 text-center text-[11px] font-bold ${
                    team.rank === 1 ? "text-[var(--gold)]" : "text-[var(--ink-3)]"
                  }`}
                >
                  {team.rank}
                </span>
                <p
                  className={`flex-1 text-xs font-medium truncate ${
                    team.isMe ? "text-[var(--gold)]" : "text-[var(--ink)]"
                  }`}
                >
                  {team.displayName}
                </p>
                <span className="text-[10px] text-[var(--ink-2)]">{record}</span>
                <span className="text-[10px] text-[var(--ink-3)]">{team.pointsFor.toFixed(1)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {onViewFull && rankings.length > 0 && (
        <button
          onClick={onViewFull}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line-2)] py-2 text-[11px] text-[var(--ink-3)] hover:border-[var(--field)]/50 hover:text-[var(--ink-2)] transition"
        >
          Full Power Rankings <FiChevronRight className="h-3 w-3" />
        </button>
      )}
    </section>
  );
}
