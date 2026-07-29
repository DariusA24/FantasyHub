"use client";

import { FiZap } from "react-icons/fi";
import type { MatchupTeam } from "./types";

type Props = {
  loaded: boolean;
  week?: number;
  matchup: {
    myTeam: MatchupTeam;
    opponent: MatchupTeam | null;
  } | null;
};

export function WeekMatchup({ loaded, week, matchup }: Props) {
  return (
    <section className="hub-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <FiZap className="h-3.5 w-3.5 text-[var(--field-2)]" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-2)]">
          {week ? `Week ${week} Matchup` : "Current Matchup"}
        </h2>
      </div>

      {!loaded ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-14 rounded-xl bg-[var(--card-2)]" />
          <div className="h-14 rounded-xl bg-[var(--card-2)]" />
        </div>
      ) : !matchup ? (
        <p className="py-4 text-center text-xs text-[var(--ink-3)] italic">
          No matchup found for this week.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {[matchup.myTeam, matchup.opponent].map((team, i) => {
              if (!team) return null;
              const isMe = i === 0;
              const myPts = matchup.myTeam.points;
              const oppPts = matchup.opponent?.points ?? 0;
              const isWinning = isMe ? myPts >= oppPts : oppPts > myPts;
              return (
                <div
                  key={team.displayName}
                  className={`rounded-xl border px-3 py-2.5 flex items-center justify-between ${
                    isMe ? "border-[var(--field)]/40 bg-[var(--field)]/8" : "hub-inner-card"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-semibold ${isMe ? "text-[var(--ink)]" : "text-[var(--ink-2)]"}`}>
                      {team.displayName}
                    </p>
                    {team.projectedPoints > 0 && (
                      <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
                        Proj: {team.projectedPoints.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <p className={`font-display text-xl font-bold ${isWinning ? "text-[var(--field-2)]" : "text-[var(--ink-3)]"}`}>
                    {team.points.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          {matchup.opponent && (() => {
            const my = matchup.myTeam.points;
            const opp = matchup.opponent!.points;
            const total = my + opp;
            const myPct = total > 0 ? Math.round((my / total) * 100) : 50;
            return (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] font-semibold">
                  <span className="text-[var(--field-2)]">{myPct}%</span>
                  <span className="text-[var(--ink-3)] font-normal">Score Split</span>
                  <span className="text-[var(--ink-2)]">{100 - myPct}%</span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--card-2)]">
                  <div
                    className="h-full rounded-l-full bg-[var(--field)] transition-all duration-500"
                    style={{ width: `${myPct}%` }}
                  />
                  <div
                    className="h-full rounded-r-full bg-[var(--clay)] transition-all duration-500"
                    style={{ width: `${100 - myPct}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </>
      )}
    </section>
  );
}
