import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/utils/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUsers, FiLock, FiCalendar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { EspnLeagueNav } from './LeagueNav';
import { LeagueBlog } from '@/app/hub-league/[hubLeagueId]/components/LeagueBlog';

const ESPN_BASES = [
  'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl',
  'https://fantasy.espn.com/apis/v3/games/ffl',
];

const SLOT_MAP: Record<number, string> = {
  0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'D/ST', 17: 'K',
  20: 'BN', 21: 'IR', 23: 'FLEX', 24: 'FLEX',
};

const POS_MAP: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST',
};

const POS_COLORS: Record<string, string> = {
  QB:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  WR:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  RB:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  TE:   'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  K:    'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
  'D/ST': 'bg-red-500/10 text-red-500 dark:text-red-400',
  FLEX: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  BN:   'bg-zinc-400/10 text-zinc-400 dark:text-zinc-600',
  IR:   'bg-rose-500/10 text-rose-400',
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchLeague(leagueId: string, season: string, cookieHeader?: string) {
  const views = 'view=mSettings&view=mTeam&view=mRoster&view=mSchedule&view=mTransactions2';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://fantasy.espn.com/',
    'Origin': 'https://fantasy.espn.com',
  };
  if (cookieHeader) headers['Cookie'] = cookieHeader;

  for (const base of ESPN_BASES) {
    const url = `${base}/seasons/${season}/segments/0/leagues/${leagueId}?${views}`;
    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (res.status === 401 || res.status === 403) return { error: 'private' as const };
      if (res.status === 404) return { error: 'notfound' as const };
      const text = await res.text();
      if (!text || !text.trimStart().startsWith('{')) continue;
      const data = JSON.parse(text);
      return { data };
    } catch { continue; }
  }
  return { error: 'notfound' as const };
}

export default async function EspnLeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ?? '2025';

  let cookieHeader: string | undefined;
  try {
    const { userId } = await auth();
    if (userId) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
        select: { espnSwid: true, espnS2: true },
      });
      if (profile?.espnSwid && profile?.espnS2) {
        cookieHeader = `SWID=${profile.espnSwid}; espn_s2=${profile.espnS2}`;
      }
    }
  } catch { /* proceed without cookies */ }

  const result = await fetchLeague(leagueId, season, cookieHeader);

  if ('error' in result) {
    if (result.error === 'private') {
      return (
        <div className="hub-page flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <FiLock className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Private League</h1>
            <p className="text-sm text-zinc-500">
              Go to your <Link href="/profile" className="text-red-500 hover:underline">profile settings</Link> and add your ESPN cookies under &ldquo;Private League Access&rdquo; to view this league.
            </p>
          </div>
        </div>
      );
    }
    notFound();
  }

  const raw = result.data;

  // ── Settings ──────────────────────────────────────────────────────────────
  const sc = raw.settings?.scoringSettings ?? {};
  const rs = raw.settings?.rosterSettings ?? {};
  const ss = raw.settings?.scheduleSettings ?? {};

  const recPts: number = sc.rec ?? 0;
  const scoringLabel = recPts === 1 ? 'PPR' : recPts === 0.5 ? 'Half PPR' : 'Standard';

  const playoffTeams: number  = ss.playoffTeamCount ?? 0;
  const regularWeeks: number  = ss.regularSeasonMatchupPeriodCount ?? 13;
  const totalWeeks: number    = ss.matchupPeriodCount ?? regularWeeks;
  const currentPeriod: number = raw.scoringPeriodId ?? 1;

  const slotCounts: Record<string, number> = rs.lineupSlotCounts ?? {};
  const rosterSlots = Object.entries(slotCounts)
    .filter(([, count]) => count > 0)
    .map(([slotId, count]) => ({ name: SLOT_MAP[Number(slotId)] ?? `Slot ${slotId}`, count }))
    .filter(s => s.name !== 'BN' && s.name !== 'IR');

  const benchCount  = slotCounts['20'] ?? 0;
  const irCount     = slotCounts['21'] ?? 0;

  const keyScoring: { label: string; value: string }[] = [
    { label: 'Reception',    value: recPts > 0 ? `+${recPts} pts` : '—' },
    { label: 'Rush TD',      value: sc.rushTD     != null ? `+${sc.rushTD} pts`    : '—' },
    { label: 'Rec TD',       value: sc.recTD      != null ? `+${sc.recTD}  pts`    : '—' },
    { label: 'Pass TD',      value: sc.passTD     != null ? `+${sc.passTD} pts`    : '—' },
    { label: 'Rush Yds',     value: sc.rushYds    != null ? `+${sc.rushYds}/yd`    : '—' },
    { label: 'Rec Yds',      value: sc.recYds     != null ? `+${sc.recYds}/yd`     : '—' },
    { label: 'Pass Yds',     value: sc.passYds    != null ? `+${sc.passYds}/yd`    : '—' },
    { label: 'Interception', value: sc.passingInterceptions != null ? `${sc.passingInterceptions} pts` : '—' },
    { label: 'Fumble Lost',  value: sc.lostFumbles != null ? `${sc.lostFumbles} pts` : '—' },
  ].filter(s => s.value !== '—');

  // ── Teams ─────────────────────────────────────────────────────────────────
  type Player = { name: string; pos: string; slotId: number };
  type Team = {
    id: number; name: string; abbrev: string;
    wins: number; losses: number; ties: number;
    pf: number; pa: number; winPct: number;
    streak: number; streakType: 'W' | 'L';
    playoffSeed: number | null;
    roster: Player[];
    owners: string[];
  };

  const teams: Team[] = (raw.teams ?? []).map((t: any) => {
    const wins   = t.record?.overall?.wins   ?? 0;
    const losses = t.record?.overall?.losses ?? 0;
    const ties   = t.record?.overall?.ties   ?? 0;
    const gp     = wins + losses + ties;
    return {
      id:      t.id,
      name:    `${t.location ?? ''} ${t.nickname ?? ''}`.trim() || t.abbrev,
      abbrev:  t.abbrev ?? '',
      wins, losses, ties,
      pf:      t.record?.overall?.pointsFor     ?? 0,
      pa:      t.record?.overall?.pointsAgainst ?? 0,
      winPct:  gp > 0 ? ((wins + ties * 0.5) / gp) * 100 : 0,
      streak:      t.record?.overall?.streakLength ?? 0,
      streakType:  (t.record?.overall?.streakType === 'WIN' ? 'W' : 'L') as 'W' | 'L',
      playoffSeed: t.playoffSeed ?? null,
      owners:  (t.owners ?? [t.primaryOwner]).filter(Boolean),
      roster:  (t.roster?.entries ?? []).map((e: any) => ({
        name:   e.playerPoolEntry?.playerPoolEntry?.player?.fullName
             ?? e.playerPoolEntry?.player?.fullName
             ?? 'Unknown',
        pos:    POS_MAP[
                  e.playerPoolEntry?.playerPoolEntry?.player?.defaultPositionId
                  ?? e.playerPoolEntry?.player?.defaultPositionId
                ] ?? '—',
        slotId: e.lineupSlotId,
      })),
    };
  });

  const standings = [...teams].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
  const teamById  = new Map(teams.map(t => [t.id, t]));

  // ── Schedule ──────────────────────────────────────────────────────────────
  type MatchupEntry = { home: { teamId: number; pts: number }; away: { teamId: number; pts: number }; winner: string; isPlayoff: boolean };
  const byWeek = new Map<number, MatchupEntry[]>();

  for (const m of raw.schedule ?? []) {
    const week = m.matchupPeriodId as number;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push({
      home:      { teamId: m.home?.teamId ?? 0, pts: m.home?.totalPoints ?? 0 },
      away:      { teamId: m.away?.teamId ?? 0, pts: m.away?.totalPoints ?? 0 },
      winner:    m.winner ?? 'UNDECIDED',
      isPlayoff: (m.playoffTierType ?? 'NONE') !== 'NONE',
    });
  }
  const scheduleWeeks = Array.from(byWeek.keys()).sort((a, b) => a - b);

  // ── Managers ──────────────────────────────────────────────────────────────
  type Manager = { id: string; displayName: string; isLeagueManager: boolean };
  const managers: Manager[] = (raw.members ?? [])
    .map((m: any) => ({
      id: m.id,
      displayName: m.displayName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Manager',
      isLeagueManager: !!m.isLeagueManager,
    }))
    .sort((a: Manager, b: Manager) => Number(b.isLeagueManager) - Number(a.isLeagueManager));

  // ── Recent trades ─────────────────────────────────────────────────────────
  // Player names come from current rosters (mRoster); traded players are almost
  // always still rostered, otherwise fall back to the raw player ID.
  const playerInfo = new Map<number, { name: string; pos: string | null }>();
  for (const t of raw.teams ?? []) {
    for (const e of t.roster?.entries ?? []) {
      const player = e.playerPoolEntry?.playerPoolEntry?.player ?? e.playerPoolEntry?.player;
      if (e.playerId != null) {
        playerInfo.set(e.playerId, {
          name: player?.fullName ?? `Player #${e.playerId}`,
          pos: POS_MAP[player?.defaultPositionId] ?? null,
        });
      }
    }
  }

  type RecentTrade = {
    id: string;
    when: string;
    teams: { displayName: string; players: { name: string; position: string | null }[]; picks: string[] }[];
  };

  const recentTrades: RecentTrade[] = ((raw.transactions ?? []) as any[])
    .filter(t => t.status === 'EXECUTED' && (t.items ?? []).some((i: any) => i.type === 'TRADE'))
    .sort((a, b) => (b.processDate ?? b.proposedDate ?? 0) - (a.processDate ?? a.proposedDate ?? 0))
    .slice(0, 5)
    .map(t => {
      const byTeam = new Map<number, { players: { name: string; position: string | null }[]; picks: string[] }>();
      for (const item of t.items ?? []) {
        if (item.type !== 'TRADE') continue;
        if (!byTeam.has(item.toTeamId)) byTeam.set(item.toTeamId, { players: [], picks: [] });
        const assets = byTeam.get(item.toTeamId)!;
        if (item.playerId != null && item.playerId > 0) {
          const p = playerInfo.get(item.playerId);
          assets.players.push({ name: p?.name ?? `Player #${item.playerId}`, position: p?.pos ?? null });
        } else if (item.overallPickNumber != null) {
          assets.picks.push(`Pick #${item.overallPickNumber}`);
        }
      }
      return {
        id: String(t.id),
        when: timeAgo(t.processDate ?? t.proposedDate ?? Date.now()),
        teams: Array.from(byTeam.entries()).map(([teamId, assets]) => ({
          displayName: teamById.get(teamId)?.name ?? `Team ${teamId}`,
          ...assets,
        })),
      };
    })
    .filter(t => t.teams.length > 0);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const highScorer  = standings[0];
  const allPts      = teams.map(t => t.pf);
  const leagueAvg   = allPts.length ? allPts.reduce((a, b) => a + b, 0) / allPts.length : 0;
  const highestWeeklyPts = Math.max(
    ...Array.from(byWeek.values()).flat().flatMap(m => [m.home.pts, m.away.pts]).filter(p => p > 0),
    0,
  );

  const leagueName = raw.settings?.name ?? 'ESPN League';

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">

        <EspnLeagueNav />

        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
        </div>

        {/* ─── Hero ─────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]" />
              ESPN Fantasy
            </div>

            <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
              {leagueName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                Football
              </span>
              <span className="rounded-full border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F4D06F]">
                {season} Season
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {scoringLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <FiUsers className="h-3 w-3" />
                {teams.length} teams
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Week {currentPeriod} of {totalWeeks}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Stat Cards ───────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: FiAward,      label: 'League Leader',    value: highScorer?.name ?? '—',                        sub: highScorer ? `${highScorer.wins}–${highScorer.losses}` : '' },
            { icon: FiTrendingUp, label: 'Most Points',      value: highScorer ? `${highScorer.pf.toFixed(1)}` : '—', sub: 'pts for' },
            { icon: FiCalendar,   label: 'Best Single Week', value: highestWeeklyPts > 0 ? `${highestWeeklyPts.toFixed(1)}` : '—', sub: 'pts' },
            { icon: FiUsers,      label: 'League Avg PF',    value: `${leagueAvg.toFixed(1)}`,                      sub: 'pts / team' },
          ].map(card => (
            <div key={card.label} className="hub-card p-4">
              <card.icon className="mb-2 h-4 w-4 text-red-500 dark:text-red-400" />
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 truncate">{card.value}</p>
              <p className="text-[10px] text-zinc-500">{card.label}</p>
              {card.sub && <p className="text-[10px] text-zinc-400">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* ─── Standings + Settings sidebar ─────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">

          {/* Standings */}
          <section className="hub-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Standings</h2>
              {playoffTeams > 0 && (
                <p className="text-[11px] text-zinc-500 mt-0.5">Gold = playoff position</p>
              )}
            </div>

            <div className="grid grid-cols-[1.5rem_1fr_5rem_5rem_4rem_4rem] items-center gap-x-2 px-5 py-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 border-b border-zinc-100 dark:border-zinc-800/40">
              <span>#</span>
              <span>Team</span>
              <span className="text-right">W–L</span>
              <span className="text-right">PF</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Streak</span>
            </div>

            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {standings.map((team, i) => {
                const inPlayoffs = playoffTeams > 0 && i < playoffTeams;
                const rankColor  = i === 0 ? 'text-amber-500 dark:text-[#F4D06F]'
                                 : i === 1 ? 'text-zinc-400'
                                 : i === 2 ? 'text-amber-700 dark:text-amber-600'
                                 : 'text-zinc-400 dark:text-zinc-600';
                const diff = team.pf - team.pa;
                return (
                  <li
                    key={team.id}
                    className={`grid grid-cols-[1.5rem_1fr_5rem_5rem_4rem_4rem] items-center gap-x-2 px-5 py-3 ${inPlayoffs ? 'bg-amber-50/30 dark:bg-amber-500/[0.03]' : ''}`}
                  >
                    <span className={`text-sm font-black ${rankColor}`}>{i + 1}</span>
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-black text-red-600 dark:text-red-400">
                        {team.abbrev.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{team.name}</p>
                      </div>
                    </div>
                    <span className="text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                      {team.wins}–{team.losses}{team.ties > 0 ? `–${team.ties}` : ''}
                    </span>
                    <span className="text-right text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {team.pf.toFixed(1)}
                    </span>
                    <span className={`text-right text-xs font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                    </span>
                    <span className={`text-right text-xs font-bold ${team.streakType === 'W' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {team.streak}{team.streakType}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Settings sidebar */}
          <section className="hub-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">League Settings</h2>
            <div className="space-y-4">

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Roster Slots</p>
                <div className="flex flex-wrap gap-1.5">
                  {rosterSlots.map(s => (
                    <span key={s.name} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${POS_COLORS[s.name] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                      {s.count}× {s.name}
                    </span>
                  ))}
                  {benchCount > 0 && <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-500">{benchCount}× BN</span>}
                  {irCount     > 0 && <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-400">{irCount}× IR</span>}
                </div>
              </div>

              {keyScoring.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Scoring</p>
                  <ul className="space-y-1.5">
                    {keyScoring.map(s => (
                      <li key={s.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">{s.label}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Format</p>
                <ul className="space-y-1.5">
                  {[
                    { label: 'Scoring',       value: scoringLabel },
                    { label: 'Teams',         value: `${teams.length}` },
                    { label: 'Reg Season',    value: `${regularWeeks} weeks` },
                    { label: 'Playoff Teams', value: `${playoffTeams}` },
                  ].map(row => (
                    <li key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">{row.label}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </section>
        </div>

        {/* ─── Managers + Blog + Recent Trades ──────────────── */}
        <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-6 items-start">

          {/* Managers */}
          <section className="md:col-span-1 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Managers</h2>
              <span className="rounded-full bg-gray-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
                {managers.length} total
              </span>
            </div>
            {managers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No managers yet.</p>
            ) : (
              <ul className="space-y-2">
                {managers.map(m => (
                  <li key={m.id} className="hub-inner-card flex items-center gap-2 rounded-xl px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-red-500/10 text-[10px] font-bold text-red-500 dark:text-red-400">
                      {m.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                        {m.displayName}
                      </p>
                      {m.isLeagueManager && (
                        <span className="mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[9px] font-medium capitalize bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30">
                          commissioner
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <LeagueBlog apiBase={`/api/espn/league/${leagueId}`} />

          {/* Recent Trades */}
          <section className="md:col-span-2 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Recent Trades</h2>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400">
                Live
              </span>
            </div>

            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-zinc-500">No recent trades</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentTrades.map(trade => (
                  <li key={trade.id} className="hub-inner-card rounded-xl px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {trade.teams.map(t => t.displayName).join(' ↔ ')}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-300 dark:text-zinc-600">{trade.when}</span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${trade.teams.length}, 1fr)` }}>
                      {trade.teams.map(team => (
                        <div key={team.displayName}>
                          <p className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-zinc-600 mb-1">
                            {team.displayName} gets
                          </p>
                          <div className="space-y-0.5">
                            {team.players.map(p => (
                              <p key={p.name} className="text-[11px] font-medium text-emerald-400 truncate">
                                {p.name}
                                {p.position && <span className="ml-1 text-zinc-600">{p.position}</span>}
                              </p>
                            ))}
                            {team.picks.map(pick => (
                              <p key={pick} className="text-[11px] font-medium text-[#F4D06F]/80 truncate">
                                {pick}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* ─── Season Schedule ───────────────────────────────── */}
        <section className="mt-4 hub-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Season Schedule</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {scheduleWeeks.map(week => {
              const weekMatchups = byWeek.get(week) ?? [];
              const isPlayoff = weekMatchups.some(m => m.isPlayoff);
              return (
                <details key={week} className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {isPlayoff ? `Playoffs — Period ${week}` : `Week ${week}`}
                      </span>
                      {week <= currentPeriod && (
                        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">Final</span>
                      )}
                      {week === currentPeriod + 1 && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">Upcoming</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400">{weekMatchups.length} matchup{weekMatchups.length !== 1 ? 's' : ''}</span>
                  </summary>
                  <ul className="px-5 pb-3 space-y-2 pt-1">
                    {weekMatchups.map((m, i) => {
                      const homeTeam = teamById.get(m.home.teamId);
                      const awayTeam = teamById.get(m.away.teamId);
                      const homeWon  = m.winner === 'HOME';
                      const awayWon  = m.winner === 'AWAY';
                      return (
                        <li key={i} className="hub-inner-card flex items-center gap-2 rounded-xl px-3 py-2">
                          <span className={`flex-1 text-xs font-medium truncate ${homeWon ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}`}>
                            {homeTeam?.name ?? `Team ${m.home.teamId}`}
                          </span>
                          <div className="shrink-0 flex items-center gap-1.5 text-sm font-black tabular-nums">
                            <span className={homeWon ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
                              {m.home.pts > 0 ? m.home.pts.toFixed(2) : '—'}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">vs</span>
                            <span className={awayWon ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
                              {m.away.pts > 0 ? m.away.pts.toFixed(2) : '—'}
                            </span>
                          </div>
                          <span className={`flex-1 text-right text-xs font-medium truncate ${awayWon ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'}`}>
                            {awayTeam?.name ?? `Team ${m.away.teamId}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>

        {/* ─── Team Rosters ──────────────────────────────────── */}
        <section className="mt-4 hub-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Team Rosters</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {standings.map((team, i) => {
              const starters = team.roster.filter(p => p.slotId !== 20 && p.slotId !== 21);
              const bench    = team.roster.filter(p => p.slotId === 20);
              const ir       = team.roster.filter(p => p.slotId === 21);
              const rankColor = i === 0 ? 'text-amber-500 dark:text-[#F4D06F]'
                              : i === 1 ? 'text-zinc-400'
                              : i === 2 ? 'text-amber-700 dark:text-amber-600'
                              : 'text-zinc-400 dark:text-zinc-600';
              return (
                <details key={team.id}>
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-black w-5 ${rankColor}`}>{i + 1}</span>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-black text-red-600 dark:text-red-400">
                        {team.abbrev.slice(0, 4)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{team.name}</p>
                        <p className="text-[11px] text-zinc-500">{team.wins}–{team.losses} · {team.pf.toFixed(1)} pts</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400">{team.roster.length} players</span>
                  </summary>
                  <div className="px-5 pb-4 pt-1">
                    <div className="mb-2">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Starters</p>
                      <ul className="space-y-1">
                        {starters.map((p, j) => (
                          <li key={j} className="flex items-center gap-2.5">
                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold w-10 text-center ${POS_COLORS[SLOT_MAP[p.slotId] ?? p.pos] ?? POS_COLORS[p.pos] ?? 'bg-zinc-100 text-zinc-500'}`}>
                              {SLOT_MAP[p.slotId] ?? p.pos}
                            </span>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{p.name}</span>
                            <span className={`ml-auto shrink-0 text-[9px] font-semibold ${POS_COLORS[p.pos] ?? 'text-zinc-400'}`}>{p.pos}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {bench.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Bench</p>
                        <ul className="space-y-1">
                          {bench.map((p, j) => (
                            <li key={j} className="flex items-center gap-2.5 opacity-60">
                              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold w-10 text-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500">BN</span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{p.name}</span>
                              <span className={`ml-auto shrink-0 text-[9px] font-semibold ${POS_COLORS[p.pos] ?? 'text-zinc-400'}`}>{p.pos}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ir.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">IR</p>
                        <ul className="space-y-1">
                          {ir.map((p, j) => (
                            <li key={j} className="flex items-center gap-2.5 opacity-60">
                              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold w-10 text-center bg-rose-500/10 text-rose-400">IR</span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{p.name}</span>
                              <span className={`ml-auto shrink-0 text-[9px] font-semibold ${POS_COLORS[p.pos] ?? 'text-zinc-400'}`}>{p.pos}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
