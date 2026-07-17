import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { FiAward, FiTrendingUp, FiUsers, FiShield, FiStar, FiCalendar, FiZap, FiTarget } from 'react-icons/fi';
import { prisma } from '@/utils/db';
import {
  getSleeperUserById,
  getUserLeagues,
  getLeagueRosters,
  getLeagueDrafts,
  getDraftPicks,
  getLeagueWinnersBracket,
} from '@/utils/sleeperService';
import AvatarImage from './AvatarImage';
import EditProfilePanel from './EditProfilePanel';
import ManagerSearch from './ManagerSearch';
import ShareButton from './ShareButton';
import TrophyCase from './TrophyCase';

const SEASONS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

type LeagueEntry = { league: any; record: { wins: number; losses: number; ties: number }; isChampion: boolean };
type LeagueHistory = Record<string, LeagueEntry[]>;

const TIER_STYLES: Record<string, string> = {
  legend:  'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-[#F4D06F]',
  expert:  'border-purple-400/40 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  analyst: 'border-blue-400/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  rookie:  'border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400',
};

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  WR: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  RB: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  TE: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  K:  'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
};

async function loadManagerData(username: string) {
  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      id: true,
      clerkId: true,
      firstName: true,
      lastName: true,
      username: true,
      profileImage: true,
      bio: true,
      sleeperProfileId: true,
    },
  });
  if (!profile) return null;

  // Hub-league extras stored locally — available even without a Sleeper link
  const [awards, predictionStat, bestWeekAgg] = await Promise.all([
    prisma.hubLeagueAward.findMany({
      where: { profileId: profile.id },
      orderBy: [{ season: 'desc' }, { createdAt: 'desc' }],
      include: { hubLeague: { select: { name: true } } },
    }),
    prisma.userPredictionStat.findUnique({ where: { profileId: profile.id } }),
    prisma.hubLeagueSeasonStat.aggregate({
      where: { profileId: profile.id },
      _max: { highWeek: true },
    }),
  ]);
  const bestWeek = bestWeekAgg._max.highWeek;

  if (!profile.sleeperProfileId) {
    return { profile, sleeperUser: null, careerStats: null, leagueHistory: {} as LeagueHistory, mostDrafted: [], awards, predictionStat, bestWeek };
  }

  const sleeperUserId = profile.sleeperProfileId;

  const [sleeperUser, ...leagueResults] = await Promise.allSettled([
    getSleeperUserById(sleeperUserId),
    ...SEASONS.map((s) => getUserLeagues(sleeperUserId, 'nfl', s)),
  ]);

  // Deduplicate leagues across seasons
  const seen = new Set<string>();
  const allLeagues: any[] = [];
  for (const r of leagueResults) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const league of r.value) {
        if (!seen.has(league.league_id)) {
          seen.add(league.league_id);
          allLeagues.push(league);
        }
      }
    }
  }

  // Per-league: fetch record and draft picks in parallel
  const leagueData = await Promise.all(
    allLeagues.map(async (league) => {
      const [recordRes, picksRes, bracketRes] = await Promise.allSettled([
        getLeagueRosters(league.league_id).then((rosters) => {
          const mine = Array.isArray(rosters)
            ? rosters.find((r: any) => r.owner_id === sleeperUserId)
            : null;
          return {
            wins:   Number(mine?.settings?.wins   ?? 0),
            losses: Number(mine?.settings?.losses ?? 0),
            ties:   Number(mine?.settings?.ties   ?? 0),
            pointsFor:     Number(mine?.settings?.fpts         ?? 0) + Number(mine?.settings?.fpts_decimal         ?? 0) / 100,
            pointsAgainst: Number(mine?.settings?.fpts_against ?? 0) + Number(mine?.settings?.fpts_against_decimal ?? 0) / 100,
            rosterId: mine?.roster_id ?? null,
          };
        }),
        getLeagueDrafts(league.league_id).then(async (drafts) => {
          if (!Array.isArray(drafts) || drafts.length === 0) return [];
          const allPicks = await Promise.all(
            drafts.map((d: any) => getDraftPicks(d.draft_id).catch(() => [] as any[]))
          );
          return allPicks.flat().filter((p: any) => p.picked_by === sleeperUserId);
        }),
        getLeagueWinnersBracket(league.league_id),
      ]);

      const record = recordRes.status === 'fulfilled'
        ? recordRes.value
        : { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, rosterId: null };
      const bracket = bracketRes.status === 'fulfilled' && Array.isArray(bracketRes.value)
        ? bracketRes.value
        : [];

      // Bracket matches carry roster ids in t1/t2 once decided; p === 1 marks the title game
      const rosterId = record.rosterId;
      const madePlayoffs = rosterId != null
        && bracket.some((m: any) => m.t1 === rosterId || m.t2 === rosterId);
      const titleMatch = bracket.find((m: any) => m.p === 1);
      const isChampion = rosterId != null && titleMatch?.w === rosterId;

      return {
        league,
        record,
        myPicks: picksRes.status === 'fulfilled' ? picksRes.value : [],
        madePlayoffs,
        isChampion,
      };
    })
  );

  // Tally draft picks by player_id — skill positions only
  const SKILL = new Set(['QB', 'WR', 'RB', 'TE', 'K']);
  const pickCounts: Record<string, { playerId: string; name: string; position: string; team: string; count: number }> = {};
  for (const { myPicks } of leagueData) {
    for (const pick of myPicks as any[]) {
      const pid = pick.player_id;
      const pos = pick.metadata?.position ?? '';
      if (!pid || !SKILL.has(pos)) continue;
      if (!pickCounts[pid]) {
        pickCounts[pid] = {
          playerId: pid,
          name: `${pick.metadata?.first_name ?? ''} ${pick.metadata?.last_name ?? ''}`.trim() || 'Unknown',
          position: pos,
          team: pick.metadata?.team ?? '',
          count: 0,
        };
      }
      pickCounts[pid].count++;
    }
  }
  const mostDrafted = Object.values(pickCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Career stats
  const totalWins          = leagueData.reduce((s, l) => s + l.record.wins,          0);
  const totalLosses        = leagueData.reduce((s, l) => s + l.record.losses,        0);
  const totalPointsFor     = leagueData.reduce((s, l) => s + l.record.pointsFor,     0);
  const totalPointsAgainst = leagueData.reduce((s, l) => s + l.record.pointsAgainst, 0);
  const totalGames  = totalWins + totalLosses;

  const championshipSeasons = leagueData
    .filter((l) => l.isChampion)
    .map((l) => String(l.league.season))
    .sort((a, b) => Number(b) - Number(a));
  const playoffAppearances = leagueData.filter((l) => l.madePlayoffs).length;

  // Group by season
  const leagueHistory: LeagueHistory = {};
  for (const { league, record, isChampion } of leagueData) {
    if (!leagueHistory[league.season]) leagueHistory[league.season] = [];
    leagueHistory[league.season].push({ league, record, isChampion });
  }

  return {
    profile,
    sleeperUser: sleeperUser.status === 'fulfilled' ? sleeperUser.value : null,
    careerStats: {
      totalLeagues: allLeagues.length,
      totalWins,
      totalLosses,
      winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
      pointsFor: totalPointsFor,
      pointsAgainst: totalPointsAgainst,
      championships: championshipSeasons.length,
      championshipSeasons,
      playoffAppearances,
    },
    leagueHistory,
    mostDrafted,
    awards,
    predictionStat,
    bestWeek,
  };
}

export default async function ManagerPage({ params }: { params: Promise<{ username: string }> }) {
  const { userId: viewerClerkId } = await auth();
  const { username } = await params;
  const data = await loadManagerData(username);
  if (!data) notFound();

  const { profile, sleeperUser, careerStats, leagueHistory, mostDrafted, awards, predictionStat, bestWeek } = data;
  const isOwner = viewerClerkId === profile.clerkId;

  const predictionAccuracy = predictionStat && predictionStat.totalVotes > 0
    ? Math.round((predictionStat.correctPicks / predictionStat.totalVotes) * 100)
    : null;

  const sortedSeasons = Object.keys(leagueHistory).sort((a, b) => Number(b) - Number(a));
  const managerSince  = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1] : null;

  const avatarUrl = profile.profileImage
    || (sleeperUser?.avatar ? `https://sleepercdn.com/avatars/thumbs/${sleeperUser.avatar}` : null)
    || '/default-profile.png';

  const statCards = careerStats ? [
    { label: 'Leagues Played', value: careerStats.totalLeagues, icon: FiUsers,      color: 'text-blue-600 dark:text-blue-400',        bg: 'bg-blue-500/10' },
    { label: 'Career Wins',    value: careerStats.totalWins,    icon: FiAward,      color: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-500/10' },
    { label: 'Career Losses',  value: careerStats.totalLosses,  icon: FiShield,     color: 'text-red-600 dark:text-red-400',          bg: 'bg-red-500/10' },
    { label: 'Win Rate',       value: `${careerStats.winRate}%`,icon: FiTrendingUp, color: 'text-amber-600 dark:text-[#F4D06F]',      bg: 'bg-amber-500/10 dark:bg-[#F4D06F]/10' },
    { label: 'Points For',     value: Math.round(careerStats.pointsFor).toLocaleString(),     icon: FiZap,    color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Points Against', value: Math.round(careerStats.pointsAgainst).toLocaleString(), icon: FiTarget, color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-500/10' },
    { label: 'Championships',  value: careerStats.championships,      icon: FiAward, color: 'text-amber-600 dark:text-[#F4D06F]', bg: 'bg-amber-500/10 dark:bg-[#F4D06F]/10' },
    { label: 'Playoff Berths', value: careerStats.playoffAppearances, icon: FiStar,  color: 'text-rose-600 dark:text-rose-400',   bg: 'bg-rose-500/10' },
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">

        {/* ── Manager Search ─────────────────────────── */}
        <div className="mb-6 md:max-w-sm">
          <ManagerSearch />
        </div>

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0d0f1a] p-6 shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
                <AvatarImage src={avatarUrl} alt={profile.firstName} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    <FiStar className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
                    Manager
                  </span>
                  {managerSince && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      <FiCalendar className="h-3 w-3" />
                      Since {managerSince}
                    </span>
                  )}
                  {careerStats && careerStats.championships > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-[#F4D06F]">
                      <FiAward className="h-3 w-3" />
                      {careerStats.championships}× Champion
                      <span className="font-medium opacity-80">
                        ({careerStats.championshipSeasons.map((s) => `'${s.slice(-2)}`).join(', ')})
                      </span>
                    </span>
                  )}
                  {predictionAccuracy !== null && predictionStat && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${TIER_STYLES[predictionStat.tier] ?? TIER_STYLES.rookie}`}>
                      <FiTrendingUp className="h-3 w-3" />
                      {predictionStat.tier} Picker · {predictionAccuracy}%
                    </span>
                  )}
                  {bestWeek != null && bestWeek > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      <FiZap className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
                      Best Week {bestWeek.toFixed(1)}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 md:text-3xl">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  @{profile.username}
                  {sleeperUser?.username && (
                    <span className="ml-2 text-zinc-400 dark:text-zinc-600">
                      · Sleeper:{' '}
                      <span className="text-zinc-500 dark:text-zinc-400">{sleeperUser.username}</span>
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                  {profile.bio || (
                    isOwner
                      ? <span className="italic text-zinc-400 dark:text-zinc-600">No bio yet — add one below.</span>
                      : <span className="italic text-zinc-400 dark:text-zinc-600">No bio.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-3">
              {careerStats && (
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Career Win Rate</p>
                  <p className="text-4xl font-black text-amber-600 dark:text-[#F4D06F]">{careerStats.winRate}%</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{careerStats.totalWins}W – {careerStats.totalLosses}L</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ShareButton />
                {isOwner && (
                  <EditProfilePanel
                    initialBio={profile.bio ?? null}
                    initialProfileImage={profile.profileImage ?? null}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ─────────────────────────────── */}
        {statCards.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-4 flex flex-col gap-2 shadow-sm dark:shadow-none"
                >
                  <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{s.value}</p>
                  <p className="text-[11px] text-zinc-500">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Trophy Case ────────────────────────────── */}
        {awards.length > 0 && (
          <section className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Trophy Case</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Awards earned across hub leagues</p>
            </div>
            <TrophyCase
              awards={awards.map((a) => ({
                id: a.id,
                label: a.label,
                description: a.description,
                value: a.value,
                season: a.season,
                week: a.week,
                leagueName: a.hubLeague.name,
              }))}
            />
          </section>
        )}

        {/* ── Most Drafted Players ───────────────────── */}
        <section className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Most Drafted Players</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Players they keep coming back to</p>
            </div>
          </div>
          {mostDrafted.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              {profile.sleeperProfileId
                ? 'No draft history found across linked leagues.'
                : 'Link a Sleeper account to see draft history.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {mostDrafted.map((p, i) => (
                <li
                  key={p.playerId}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5"
                >
                  <span className={`shrink-0 text-sm font-black w-5 text-center ${i === 0 ? 'text-amber-600 dark:text-[#F4D06F]' : 'text-zinc-400 dark:text-zinc-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.name}</p>
                    <p className="text-[11px] text-zinc-500">{p.team}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${POSITION_COLORS[p.position] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                    {p.position}
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    Drafted <span className="font-semibold text-zinc-700 dark:text-zinc-300">{p.count}×</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── League History ─────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">League History</h2>

          {sortedSeasons.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              No league history found.{' '}
              {isOwner ? 'Link your Sleeper account on the profile settings page.' : ''}
            </p>
          ) : (
            <div className="space-y-5">
              {sortedSeasons.map((season) => {
                const leagues = leagueHistory[season];
                const seasonWins   = leagues.reduce((s, l) => s + l.record.wins,   0);
                const seasonLosses = leagues.reduce((s, l) => s + l.record.losses, 0);
                return (
                  <div key={season}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{season}</span>
                      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-[10px] text-zinc-500">
                        {seasonWins}W – {seasonLosses}L across {leagues.length} league{leagues.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {leagues.map(({ league, record, isChampion }) => {
                        const gp = record.wins + record.losses;
                        const wr = gp > 0 ? Math.round((record.wins / gp) * 100) : 0;
                        return (
                          <li
                            key={league.league_id}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                              isChampion
                                ? 'border-amber-400/40 bg-amber-500/5 dark:bg-[#F4D06F]/5'
                                : 'border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {league.name}
                                {isChampion && (
                                  <FiAward className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-600 dark:text-[#F4D06F]" />
                                )}
                              </p>
                              <p className="text-[11px] uppercase text-zinc-500">{league.sport}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {record.wins}–{record.losses}{record.ties > 0 ? `–${record.ties}` : ''}
                              </p>
                              <p className={`text-[10px] ${wr >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {wr}% win
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>


      </div>
    </div>
  );
}
