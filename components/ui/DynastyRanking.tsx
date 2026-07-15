'use client';

import React from 'react';

type FantasyCalcEntry = {
  player: {
    name: string;
    position: string;
    maybeTeam: string | null;
    maybeAge: number | null;
    maybeTier: number | null;
  };
  value: number;
  overallRank: number;
  positionRank: number;
  trend30Day: number;
};

// Module-level cache keyed by numQbs — persists for the lifetime of the browser session
const clientCache: Record<string, Record<string, FantasyCalcEntry | null>> = {};
const clientCachePromise: Record<string, Promise<Record<string, FantasyCalcEntry | null>>> = {};

async function loadDynastyValues(numQbs: 1 | 2): Promise<Record<string, FantasyCalcEntry | null>> {
  const key = String(numQbs);
  if (clientCache[key]) return clientCache[key];
  if (clientCachePromise[key] !== undefined) return clientCachePromise[key];

  clientCachePromise[key] = fetch(`/api/dynasty-rankings/all?numQbs=${numQbs}`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: any[]) => {
      const map: Record<string, FantasyCalcEntry | null> = {};
      for (const entry of data) {
        if (entry.player?.sleeperId) {
          map[entry.player.sleeperId] = entry;
        }
      }
      clientCache[key] = map;
      return map;
    });

  return clientCachePromise[key];
}

type DynastyRankingContainerProps = {
  sleeperPlayerId: string | null;
  playerName?: string | null;
  isSuperFlex?: boolean;
};

const TIER_STYLE: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  2: 'bg-amber-500/15 text-amber-600 dark:text-[#F4D06F] border-amber-500/30',
  3: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  4: 'bg-zinc-100 dark:bg-zinc-700/40 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600/40',
};

export const DynastyRankingContainer: React.FC<DynastyRankingContainerProps> = ({
  sleeperPlayerId,
  isSuperFlex = false,
}) => {
  const numQbs: 1 | 2 = isSuperFlex ? 2 : 1;
  const [entry, setEntry] = React.useState<FantasyCalcEntry | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sleeperPlayerId) {
      setEntry(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDynastyValues(numQbs)
      .then((map) => {
        if (!cancelled) setEntry(map[sleeperPlayerId] ?? null);
      })
      .catch((err: any) => {
        const msg = typeof err === 'string' ? err : err?.message || String(err);
        console.error('[DynastyRanking] error:', msg);
        if (!cancelled) setError(msg || 'Failed to load dynasty rankings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sleeperPlayerId, numQbs]);

  if (!sleeperPlayerId) return null;

  if (loading) {
    return (
      <div className="mt-2 space-y-2 animate-pulse">
        <div className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800/60" />
        <div className="h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800/40" />
      </div>
    );
  }

  if (error) {
    return <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">{error}</p>;
  }

  if (!entry) {
    return (
      <p className="text-[10px] text-zinc-500 italic mt-1">
        No dynasty ranking found for this player.
      </p>
    );
  }

  const trendUp = entry.trend30Day > 0;
  const trendFlat = entry.trend30Day === 0;
  const trendColor = trendUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : trendFlat
      ? 'text-zinc-500'
      : 'text-red-600 dark:text-red-400';
  const trendLabel = trendFlat ? '—' : `${trendUp ? '+' : ''}${entry.trend30Day}`;
  const tier = entry.player.maybeTier;
  const tierStyle = tier ? (TIER_STYLE[tier] ?? TIER_STYLE[4]) : TIER_STYLE[4];

  return (
    <div className="mt-2 space-y-2">
      {/* Main value card */}
      <div className="flex items-center justify-between rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            Dynasty Value
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-[#F4D06F]">
            {entry.value.toLocaleString()}
          </p>
        </div>
        <div className="text-right space-y-1">
          {tier && (
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tierStyle}`}>
              Tier {tier}
            </span>
          )}
          <p className={`text-xs font-semibold ${trendColor}`}>
            {trendLabel} <span className="text-zinc-400 dark:text-zinc-600 font-normal">30d</span>
          </p>
        </div>
      </div>

      {/* Rank grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Overall Rank</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">#{entry.overallRank}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{entry.player.position} Rank</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">#{entry.positionRank}</p>
        </div>
      </div>
    </div>
  );
};

export default DynastyRankingContainer;
