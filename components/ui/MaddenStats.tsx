'use client';

import React from 'react';
import {
  getLatestMaddenStatsByPlayerId,
  type MaddenPlayerStats,
} from '@/utils/maddenActions';

const getStatColor = (value: number) => {
  if (value >= 90) return 'text-emerald-400';
  if (value >= 80) return 'text-amber-300';
  if (value >= 70) return 'text-orange-400';
  return 'text-red-400';
};

const getBarColor = (value: number) => {
  if (value >= 90) return 'bg-emerald-400';
  if (value >= 80) return 'bg-amber-300';
  if (value >= 70) return 'bg-orange-400';
  return 'bg-red-400';
};

function formatStatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatGrid({ stats }: { stats: Record<string, number> }) {
  const entries = Object.entries(stats);
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-4 gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-center hover:border-zinc-700 transition"
        >
          <p className="text-[9px] text-zinc-500 tracking-wide mb-1 leading-tight">
            {formatStatLabel(key)}
          </p>
          <p className={`text-sm font-bold ${getStatColor(value)}`}>{value}</p>
          <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function positionStats(player: MaddenPlayerStats): Record<string, number> | null {
  const pos = player.position?.toUpperCase();
  if (pos === 'QB') return player.qb_stats;
  if (pos === 'WR') return player.wr_stats;
  if (pos === 'TE') return player.te_stats;
  if (pos === 'RB' || pos === 'FB') return player.rb_stats;
  if (pos === 'K' || pos === 'P') return player.k_stats;
  return null;
}

type MaddenStatsContainerProps = {
  sleeperPlayerId: string | null;
};

export const MaddenStatsContainer: React.FC<MaddenStatsContainerProps> = ({
  sleeperPlayerId,
}) => {
  const [maddenPlayer, setMaddenPlayer] = React.useState<MaddenPlayerStats | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sleeperPlayerId) {
      setMaddenPlayer(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getLatestMaddenStatsByPlayerId(sleeperPlayerId)
      .then((player) => {
        if (!cancelled) setMaddenPlayer(player);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load Madden stats.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sleeperPlayerId]);

  if (!sleeperPlayerId) {
    return (
      <p className="text-[10px] text-zinc-600 italic">
        Select a player to view Madden stats.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-center animate-pulse"
          >
            <div className="h-2 w-8 bg-zinc-800 rounded mx-auto mb-2" />
            <div className="h-4 w-6 bg-zinc-800 rounded mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-[10px] text-red-400">{error}</p>;
  }

  if (!maddenPlayer) {
    return (
      <p className="text-[10px] text-zinc-600 italic">
        No Madden stats found for this player.
      </p>
    );
  }

  const posStats = positionStats(maddenPlayer);

  return (
    <div className="space-y-3">
      {/* Overall + meta */}
      <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {maddenPlayer.position ?? '—'} · {maddenPlayer.team ?? '—'}
          </span>
          <span className="text-[10px] text-zinc-600 mt-0.5">
            {maddenPlayer.full_name ?? maddenPlayer.id} · Wk {maddenPlayer.week} {maddenPlayer.year}
          </span>
        </div>
        {maddenPlayer.overall !== null && (
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Overall
            </span>
            <span className={`text-2xl font-black ${getStatColor(maddenPlayer.overall)}`}>
              {maddenPlayer.overall}
            </span>
          </div>
        )}
      </div>

      {/* Shared stats */}
      {maddenPlayer.shared_stats && (
        <div className="space-y-1.5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Attributes</p>
          <StatGrid stats={maddenPlayer.shared_stats} />
        </div>
      )}

      {/* Position-specific stats */}
      {posStats && (
        <div className="space-y-1.5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
            {maddenPlayer.position} Stats
          </p>
          <StatGrid stats={posStats} />
        </div>
      )}
    </div>
  );
};

export default MaddenStatsContainer;