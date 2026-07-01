"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ComparePlayer } from "./CompareCard";

const POS_STYLE: Record<string, string> = {
  QB:  "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB:  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR:  "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE:  "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
};

const POS_RING: Record<string, string> = {
  QB:  "ring-red-400/60 dark:ring-red-500/50",
  RB:  "ring-emerald-400/60 dark:ring-emerald-500/50",
  WR:  "ring-blue-400/60 dark:ring-blue-500/50",
  TE:  "ring-orange-400/60 dark:ring-orange-500/50",
};

const POS_FALLBACK_BG: Record<string, string> = {
  QB:  "bg-red-500/15 text-red-500 dark:text-red-400",
  RB:  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  WR:  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  TE:  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

function PlayerAvatar({ sleeperId, name, position }: { sleeperId: string; name: string; position: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const ring     = POS_RING[position]     ?? "ring-zinc-300 dark:ring-zinc-700";
  const fallback = POS_FALLBACK_BG[position] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500";

  return (
    <div className={`relative h-20 w-20 rounded-full ring-2 ${ring} overflow-hidden shrink-0`}>
      {!imgError ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${sleeperId}.jpg`}
          alt={name}
          fill
          className="object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`h-full w-full flex items-center justify-center text-lg font-black ${fallback}`}>
          {initials}
        </div>
      )}
    </div>
  );
}

type VoteState = { votes: Record<string, number>; myVote: string | null; total: number } | null;

export function GateMatchup({
  week,
  season,
  ppr,
  onUnlocked,
}: {
  week: number;
  season: string;
  ppr: 0 | 0.5 | 1;
  onUnlocked: () => void;
}) {
  const [players, setPlayers]       = useState<ComparePlayer[]>([]);
  const [isOffseason, setIsOffseason] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [voting, setVoting]         = useState(false);
  const [voteState, setVoteState]   = useState<VoteState>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/start-sit/featured?week=${week}&season=${season}&ppr=${ppr}`)
      .then((r) => r.json())
      .then((d: { players?: ComparePlayer[]; isOffseason?: boolean; error?: string }) => {
        if (d.error || !d.players?.length) {
          setError("No featured matchup available right now.");
          return;
        }
        setPlayers(d.players);
        setIsOffseason(!!d.isOffseason);

        const sortedIds = d.players.map((p: ComparePlayer) => p.sleeperId).sort();
        const pairKey   = `fh-voted-${sortedIds.join("_")}`;
        const ids       = sortedIds.join(",");

        // Fast-path: already voted on this exact pair (cached locally)
        if (localStorage.getItem(pairKey) === "1") {
          onUnlocked();
          return;
        }

        // Check DB in case localStorage was cleared
        return fetch(`/api/start-sit/vote?players=${ids}&week=${week}&season=${season}`)
          .then((r) => r.json())
          .then((v: VoteState) => {
            setVoteState(v);
            if (v?.myVote) {
              localStorage.setItem(pairKey, "1");
              onUnlocked();
            }
          });
      })
      .catch(() => setError("Failed to load the featured matchup."))
      .finally(() => setLoading(false));
  }, [week, season, ppr]);

  const castVote = async (chosenId: string) => {
    setVoting(true);
    try {
      const res = await fetch("/api/start-sit/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerIds: players.map((p) => p.sleeperId),
          chosenPlayerId: chosenId,
          week,
          season,
        }),
      });
      const d = await res.json();
      if (res.status === 401) {
        setVoteState({ votes: {}, myVote: chosenId, total: 0 });
      } else {
        setVoteState(d);
      }
      // Cache this pair as voted so future page loads fast-skip the gate
      const pairKey = `fh-voted-${players.map((p) => p.sleeperId).sort().join("_")}`;
      localStorage.setItem(pairKey, "1");
    } catch {
      setVoteState({ votes: {}, myVote: chosenId, total: 0 });
    } finally {
      setVoting(false);
      onUnlocked();
    }
  };

  const hasVoted = voteState?.myVote != null;
  const maxPts   = Math.max(...players.map((p) => p.projectedPts), 1);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <span className="h-8 w-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 dark:border-t-[#F4D06F] animate-spin" />
        <p className="text-sm text-zinc-500">Loading this week's matchup…</p>
      </div>
    );
  }

  // ── Error / off-season ──
  if (error || players.length < 2) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-sm text-zinc-500">{error ?? "No matchup available yet."}</p>
        <button
          onClick={onUnlocked}
          className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Skip to tool →
        </button>
      </div>
    );
  }

  const [p1, p2] = players;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(167,139,250,0.6)]" />
          {isOffseason ? `Off-Season · Week 1 Replay` : `Community Vote · Week ${week}`}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          {hasVoted ? "Results are in" : "Who would you start?"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {isOffseason
            ? "No current projections — vote on this classic Week 1 matchup to unlock the tool."
            : hasVoted
            ? "Here's what the community thinks — then unlock the full tool."
            : "Cast your vote to unlock the Start / Sit comparison tool."}
        </p>
      </div>

      {/* Player cards */}
      <div className="w-full max-w-lg flex flex-col sm:flex-row gap-3">
        {[p1, p2].map((player, idx) => {
          const isMyVote    = voteState?.myVote === player.sleeperId;
          const count       = voteState?.votes[player.sleeperId] ?? 0;
          const total       = voteState?.total ?? 0;
          const pct         = total > 0 ? Math.round((count / total) * 100) : 0;
          const isLeading   = hasVoted && total > 0 && count === Math.max(...Object.values(voteState!.votes));
          const posClass    = POS_STYLE[player.position] ?? "text-zinc-500 bg-zinc-100 border-zinc-300";
          const barPct      = maxPts > 0 ? Math.round((player.projectedPts / maxPts) * 100) : 0;

          return (
            <div
              key={player.sleeperId}
              className={`flex-1 rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 ${
                isMyVote
                  ? "border-violet-400/50 dark:border-violet-500/40 bg-violet-50/50 dark:bg-violet-500/5"
                  : hasVoted
                  ? "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 opacity-70"
                  : "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20"
              }`}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2.5 pt-1">
                <PlayerAvatar
                  sleeperId={player.sleeperId}
                  name={player.name}
                  position={player.position}
                />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold ${posClass}`}>
                      {player.position}
                    </span>
                    {isMyVote && (
                      <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-px text-[9px] font-bold text-violet-600 dark:text-violet-400">
                        Your pick
                      </span>
                    )}
                    {isLeading && !isMyVote && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold text-amber-600 dark:text-amber-400">
                        Leading
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                    {player.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {player.team}
                    {player.opponent && (
                      <span className="ml-1.5 font-medium text-zinc-400 dark:text-zinc-500">
                        · {player.opponent}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Projection */}
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Projected
                  </span>
                  <span className="text-lg font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {player.projectedPts.toFixed(1)}
                    <span className="text-[11px] font-normal text-zinc-500 ml-0.5">pts</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-400 to-amber-300 dark:from-[#F4D06F] dark:to-amber-400"
                        : "bg-gradient-to-r from-blue-500 to-blue-400"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>

              {/* Vote result bar (after voting) */}
              {hasVoted && total > 0 && (
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-[10px] text-zinc-500">Community</span>
                    <span className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isLeading ? "bg-violet-500" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500 tabular-nums">
                    {count} vote{count !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Vote button */}
              {!hasVoted && (
                <button
                  onClick={() => castVote(player.sleeperId)}
                  disabled={voting}
                  className={`w-full rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    idx === 0
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                      : "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                  }`}
                >
                  {voting ? "…" : "Start Him"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip / hint row */}
      <div className="mt-6 flex flex-col items-center gap-1.5">
        {!hasVoted && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Your vote is anonymous · takes 1 second
          </p>
        )}
        <button
          onClick={onUnlocked}
          className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 underline underline-offset-2 transition-colors"
        >
          Skip to tool
        </button>
      </div>
    </div>
  );
}
