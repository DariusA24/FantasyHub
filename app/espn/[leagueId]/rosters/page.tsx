import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { prisma } from '@/utils/db';
import { EspnLeagueNav } from '../LeagueNav';
import { loadEspnLeague } from '../espnData';
import { EspnPrivateNotice } from '../EspnStates';
import EspnRostersView from '../EspnRostersView';
import EspnSeasonPicker from '../EspnSeasonPicker';

export default async function EspnRostersPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ?? '2025';

  const result = await loadEspnLeague(leagueId, season);
  if ('error' in result) {
    if (result.error === 'private') return <EspnPrivateNotice />;
    notFound();
  }

  const { leagueName, standings, availableSeasons, myTeamId } = result.data;

  // Map ESPN players to Sleeper players by name so rows can open the shared
  // player card (which is keyed on Sleeper player ids).
  const names = [...new Set(
    standings.flatMap(t => t.roster.map(p => p.name)).filter(n => n && n !== 'Unknown')
  )];
  const sleeperPlayers = names.length
    ? await prisma.sleeperPlayer.findMany({
        where: { full_name: { in: names } },
        select: { id: true, full_name: true, position: true, team: true },
      })
    : [];
  const sleeperByName = new Map(sleeperPlayers.map(sp => [sp.full_name, sp]));

  const teams = standings.map(t => ({
    id: t.id,
    name: t.name,
    abbrev: t.abbrev,
    wins: t.wins,
    losses: t.losses,
    pf: t.pf,
    roster: t.roster.map(p => {
      const sp = sleeperByName.get(p.name);
      return {
        espnId: p.id,
        name: p.name,
        pos: p.pos,
        slotId: p.slotId,
        sleeperId: sp?.id ?? null,
        team: sp?.team ?? null,
      };
    }),
  }));

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <EspnLeagueNav />

        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={`/espn/${leagueId}?season=${season}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            {leagueName}
          </Link>
          <EspnSeasonPicker current={season} seasons={availableSeasons} />
        </div>

        <h1 className="mb-1 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Team Rosters</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{season} · pick a team to see its lineup.</p>

        <EspnRostersView teams={teams} myTeamId={myTeamId} />
      </div>
    </div>
  );
}
