import React from 'react';
import { LeagueCard } from '@/components/ui/LeagueCard';

type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
  previous_league_id?: string | null;
  total_rosters?: number;
  status?: string;
};

type LeagueGridProps = {
  leagues: SleeperLeague[] | null;
  leagueRecords?: Record<string, { wins: number; losses: number; ties: number }>;
  onLeagueClick?: (league: SleeperLeague) => void;
};

export function LeagueGrid({ leagues, leagueRecords, onLeagueClick }: LeagueGridProps) {
  if (!leagues || leagues.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-400">
        No leagues found for this season.
      </p>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 lg:grid-cols-3">
      {leagues.map((league) => {
        const record = leagueRecords?.[league.league_id];

        return (
          <div
            key={league.league_id}
            className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer"
          >
            <LeagueCard 
              league_id={league.league_id}
              name={league.name}
              season={league.season}
              sport={league.sport}
              photo={league.avatar}
              status={league.status}
              total_rosters={league.total_rosters}
              record={record ? `${record.wins}-${record.losses}-${record.ties}` : undefined}
              onClick={() => onLeagueClick?.(league)}
            />
          </div>
        );
      })}
    </div>
  );
}
