import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/utils/db';
import { FiArrowLeft } from 'react-icons/fi';
import { EspnLeagueNav } from '../LeagueNav';
import { loadEspnFranchises } from '../espnData';
import { EspnPrivateNotice } from '../EspnStates';
import EspnFranchiseView from '../EspnFranchiseView';
import EspnSeasonPicker from '../EspnSeasonPicker';

export default async function EspnFranchisePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ?? '2025';

  const result = await loadEspnFranchises(leagueId, season);
  if ('error' in result) {
    if (result.error === 'private') return <EspnPrivateNotice />;
    notFound();
  }

  const { leagueName, availableSeasons, franchises, myOwnerId } = result.data;

  // Stored bios (per franchise/owner) + whether the viewer may edit
  const bioRows = await prisma.espnFranchiseBio.findMany({ where: { leagueId } });
  const bioMap = new Map(bioRows.map(b => [b.memberId, b.bio]));

  let canEdit = false;
  try {
    const { userId } = await auth();
    if (userId) {
      const profile = await prisma.profile.findUnique({ where: { clerkId: userId }, select: { id: true } });
      if (profile) {
        const synced = await prisma.espnLeague.findFirst({ where: { profileId: profile.id, leagueId }, select: { id: true } });
        canEdit = !!synced;
      }
    }
  } catch { /* guest */ }

  const franchiseData = franchises.map(f => ({ ...f, bio: bioMap.get(f.ownerId) ?? '' }));

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

        <h1 className="mb-1 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Franchises</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">All-time franchise history</p>

        <EspnFranchiseView franchises={franchiseData} leagueId={leagueId} canEdit={canEdit} myOwnerId={myOwnerId} />
      </div>
    </div>
  );
}
