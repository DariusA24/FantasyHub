"use client";

import { useEffect, useRef, useState } from "react";
import type { ComparePlayer } from "./CompareCard";

type VoteData = {
  votes: Record<string, number>;
  myVote: string | null;
  total: number;
};

function getGuestToken(): string {
  const key = "fh_guest_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export function VoteSection({
  players,
  week,
  season,
}: {
  players: ComparePlayer[];
  week: number;
  season: string;
}) {
  const [data, setData]       = useState<VoteData>({ votes: {}, myVote: null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [voting, setVoting]   = useState(false);
  const guestTokenRef         = useRef<string | null>(null);

  const ids = players.map((p) => p.sleeperId).sort().join(",");

  useEffect(() => {
    guestTokenRef.current = getGuestToken();
  }, []);

  useEffect(() => {
    if (players.length < 2) return;
    setLoading(true);
    const token = guestTokenRef.current ?? "";
    fetch(`/api/start-sit/vote?players=${ids}&week=${week}&season=${season}&guestToken=${token}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ids, week, season]);

  const castVote = async (chosenPlayerId: string) => {
    setVoting(true);
    try {
      const res = await fetch("/api/start-sit/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIds: players.map((p) => p.sleeperId),
          chosenPlayerId,
          week,
          season,
          guestToken: guestTokenRef.current,
        }),
      });
      const d = await res.json();
      if (res.ok) setData(d);
    } catch {
    } finally {
      setVoting(false);
    }
  };

  const hasVotes = data.total > 0;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(167,139,250,0.5)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
            Community Vote
          </h2>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600">
            · Week {week}
          </span>
        </div>
        {hasVotes && (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600">
            {data.total} vote{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Players */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
        {players.map((player) => {
          const count    = data.votes[player.sleeperId] ?? 0;
          const pct      = hasVotes ? Math.round((count / data.total) * 100) : 0;
          const isMyVote = data.myVote === player.sleeperId;
          const isLeader = hasVotes && count === Math.max(...Object.values(data.votes));

          return (
            <div key={player.sleeperId} className="px-5 py-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {player.name}
                    </p>
                    {isMyVote && (
                      <span className="shrink-0 rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-px text-[9px] font-bold text-violet-600 dark:text-violet-400">
                        Your pick
                      </span>
                    )}
                    {isLeader && hasVotes && (
                      <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold text-amber-600 dark:text-amber-400">
                        Leading
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">{player.team || "FA"} · {player.position}</p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-300 w-10 text-right">
                    {hasVotes ? `${pct}%` : "—"}
                  </span>
                  <button
                    onClick={() => castVote(player.sleeperId)}
                    disabled={voting || loading}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isMyVote
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                        : "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
                    }`}
                  >
                    {isMyVote ? "✓ Voted" : "Start"}
                  </button>
                </div>
              </div>

              {/* Vote bar */}
              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLeader && hasVotes
                      ? "bg-gradient-to-r from-violet-500 to-violet-400"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                  style={{ width: hasVotes ? `${pct}%` : "0%" }}
                />
              </div>
              {hasVotes && (
                <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600 tabular-nums">
                  {count} vote{count !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* No votes yet */}
      {!loading && !hasVotes && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/40">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-600 text-center">
            Be the first to vote on this matchup
          </p>
        </div>
      )}
    </div>
  );
}
