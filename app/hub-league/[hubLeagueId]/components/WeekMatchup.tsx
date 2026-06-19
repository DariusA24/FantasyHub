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
        <FiZap className="h-3.5 w-3.5 text-emerald-400" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          {week ? `Week ${week} Matchup` : "Current Matchup"}
        </h2>
      </div>

      {!loaded ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-14 rounded-xl bg-zinc-800/40" />
          <div className="h-14 rounded-xl bg-zinc-800/40" />
        </div>
      ) : !matchup ? (
        <p className="py-4 text-center text-xs text-zinc-500 italic">
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
                    isMe ? "border-emerald-500/30 bg-emerald-500/5" : "hub-inner-card"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-semibold ${isMe ? "text-zinc-100" : "text-zinc-400"}`}>
                      {team.displayName}
                    </p>
                    {team.projectedPoints > 0 && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Proj: {team.projectedPoints.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <p className={`text-xl font-black ${isWinning ? "text-emerald-400" : "text-zinc-500"}`}>
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
                  <span className="text-emerald-400">{myPct}%</span>
                  <span className="text-zinc-500 font-normal">Score Split</span>
                  <span className="text-zinc-400">{100 - myPct}%</span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-l-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${myPct}%` }}
                  />
                  <div
                    className="h-full rounded-r-full bg-red-800 transition-all duration-500"
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
