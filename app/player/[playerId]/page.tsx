"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { FiUser, FiArrowLeft } from "react-icons/fi";
import { PlayerDiscussion } from "@/components/player/PlayerDiscussion";

// ─── Types ────────────────────────────────────────────────────────────────────

type SleeperPlayer = {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  rawJson: Record<string, unknown>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITION_COLOR: Record<string, string> = {
  QB:  "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  RB:  "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  WR:  "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  TE:  "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  K:   "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  DEF: "border-zinc-400/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

// ─── Player Header ────────────────────────────────────────────────────────────

function PlayerHeader({ player }: { player: SleeperPlayer }) {
  const raw = player.rawJson as Record<string, unknown>;
  const yearsExp = raw.years_exp as number | undefined;
  const posColor = POSITION_COLOR[player.position ?? ""] ?? "border-zinc-300 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400";
  const [imgError, setImgError] = useState(false);
  const imgSrc = `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 p-6 mb-6">
      <div className="flex items-start gap-5">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center shrink-0 overflow-hidden">
          {!imgError ? (
            <Image
              src={imgSrc}
              alt={player.full_name ?? "Player"}
              width={64}
              height={64}
              className="object-cover object-top w-full h-full"
              onError={() => setImgError(true)}
            />
          ) : (
            <FiUser className="h-7 w-7 text-zinc-400 dark:text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
            {player.full_name ?? "Unknown Player"}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {player.position && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${posColor}`}>
                {player.position}
              </span>
            )}
            {player.team && (
              <span className="rounded-full border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                {player.team}
              </span>
            )}
            {yearsExp !== undefined && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-600">
                {yearsExp === 0 ? "Rookie" : `${yearsExp} yr${yearsExp === 1 ? "" : "s"} exp`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const router = useRouter();
  const [player, setPlayer] = useState<SleeperPlayer | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/sleeper/players/${playerId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setPlayer(d); });
  }, [playerId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Player not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
            Player Profile
          </div>
        </div>

        {player ? (
          <PlayerHeader player={player} />
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 p-6 mb-6 animate-pulse">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800/60 shrink-0" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-800/60" />
                <div className="flex gap-2">
                  <div className="h-5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800/50" />
                  <div className="h-5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800/40" />
                </div>
              </div>
            </div>
          </div>
        )}

        {playerId && <PlayerDiscussion playerId={playerId} height={520} />}
      </div>
    </div>
  );
}
