import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // NEW
import { getSleeperLeagueAvatarThumbnail } from '@/utils/sleeperActions';
import { Users, ChevronRight } from 'lucide-react';

type LeagueCardProps = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  photo: string | null;
  total_rosters?: number;
  status?: string;
  record?: string;
  platform?: 'sleeper' | 'espn';
  onClick?: () => void;
};

export function LeagueCard({
  league_id,
  name,
  season,
  sport,
  photo,
  total_rosters,
  status,
  record,
  platform,
  onClick,
}: LeagueCardProps) {
  const router = useRouter(); // NEW
  const [leagueThumbnail, setLeagueThumbnail] = React.useState<string | null>(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        if (photo) {
          const thumb = await getSleeperLeagueAvatarThumbnail(photo);
          setLeagueThumbnail(thumb ?? '/default-league-avatar.png');
        } else {
          setLeagueThumbnail('/default-league-avatar.png');
        }
      } catch {
        setLeagueThumbnail('/default-league-avatar.png');
      }
    };
    fetchThumbnail();
  }, [photo]);

  const formattedTeams =
    typeof total_rosters === 'number' ? `${total_rosters} teams` : '– teams';

  const normalizedStatusRaw = status ?? 'unknown';
  const normalizedStatus = normalizedStatusRaw.trim().toLowerCase();

  const humanStatus =
    normalizedStatus === 'in_season'
      ? 'In Season'
      : normalizedStatus === 'complete'
      ? 'Complete'
      : normalizedStatus === 'pre_draft'
      ? 'Pre Draft'
      : normalizedStatus.replace('_', ' ');

  const statusClasses =
    normalizedStatus === 'in_season'
      ? 'bg-emerald-600/90 text-emerald-50'
      : normalizedStatus === 'complete'
      ? 'bg-slate-600/90 text-slate-50'
      : 'bg-amber-600/90 text-amber-50';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // fallback: old behavior
      router.push(`/league/${league_id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full text-left flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 px-3 py-4 shadow-sm dark:shadow-md dark:shadow-black/30 hover:border-amber-400/70 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-200"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image
            src={leagueThumbnail || '/default-league-avatar.png'}
            alt={`${name} Logo`}
            width={64}
            height={64}
            className="h-16 w-16 rounded-md object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-lg font-semibold text-amber-600 dark:text-[#F4D06F] line-clamp-1">
              {name}
            </h4>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Season <span className="font-medium text-zinc-800 dark:text-zinc-200">{season}</span>
              {' · '}
              <span className="uppercase tracking-wide text-xs text-zinc-500">
                {sport}
              </span>
            </p>

            {/* bottom meta row */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {formattedTeams}
              </span>

              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClasses}`}
              >
                {humanStatus}
              </span>

              {record && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100">
                  {record}
                </span>
              )}

              {platform && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  platform === 'espn'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {platform === 'espn' ? 'ESPN' : 'Sleeper'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors duration-150" />
        </div>
      </div>
    </button>
  );
}