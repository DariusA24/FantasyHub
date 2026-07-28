import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/utils/db';
import { SLOT_MAP, POS_COLORS } from './espnConstants';

export { SLOT_MAP, POS_COLORS };

const ESPN_BASES = [
  'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl',
  'https://fantasy.espn.com/apis/v3/games/ffl',
];

const POS_MAP: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST',
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

export type EspnPlayer = { id: number; name: string; pos: string; slotId: number };
export type EspnTeam = {
  id: number; name: string; abbrev: string;
  wins: number; losses: number; ties: number;
  pf: number; pa: number; winPct: number;
  streak: number; streakType: 'W' | 'L';
  playoffSeed: number | null;
  roster: EspnPlayer[];
  owners: string[];
};
export type EspnMatchup = { home: { teamId: number; pts: number }; away: { teamId: number; pts: number }; winner: string; isPlayoff: boolean };
export type EspnManager = { id: string; displayName: string; isLeagueManager: boolean };
export type EspnRecentTrade = {
  id: string;
  when: string;
  teams: { displayName: string; players: { name: string; position: string | null }[]; picks: string[] }[];
};

export type EspnLeagueData = {
  leagueId: string;
  season: string;
  leagueName: string;
  scoringLabel: string;
  playoffTeams: number;
  regularWeeks: number;
  totalWeeks: number;
  currentPeriod: number;
  availableSeasons: string[];
  myTeamId: number | null;
  rosterSlots: { name: string; count: number }[];
  benchCount: number;
  irCount: number;
  keyScoring: { label: string; value: string }[];
  teams: EspnTeam[];
  standings: EspnTeam[];
  teamById: Map<number, EspnTeam>;
  byWeek: Map<number, EspnMatchup[]>;
  scheduleWeeks: number[];
  managers: EspnManager[];
  recentTrades: EspnRecentTrade[];
  highScorer: EspnTeam | undefined;
  leagueAvg: number;
  highestWeeklyPts: number;
};

export type EspnLoadResult = { data: EspnLeagueData } | { error: 'private' | 'notfound' };

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
      return { data: JSON.parse(text) };
    } catch { continue; }
  }
  return { error: 'notfound' as const };
}

// The signed-in user's ESPN cookie (for private-league access) and their SWID
// (their member id, used to find which team is theirs). Empty for guests.
async function resolveEspnAuth(): Promise<{ cookie?: string; swid?: string }> {
  try {
    const { userId } = await auth();
    if (userId) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
        select: { espnSwid: true, espnS2: true },
      });
      if (profile?.espnSwid && profile?.espnS2) {
        return { cookie: `SWID=${profile.espnSwid}; espn_s2=${profile.espnS2}`, swid: profile.espnSwid };
      }
      if (profile?.espnSwid) return { swid: profile.espnSwid };
    }
  } catch { /* proceed without */ }
  return {};
}

async function resolveEspnCookie(): Promise<string | undefined> {
  return (await resolveEspnAuth()).cookie;
}

// ESPN SWIDs come with braces/casing variations; normalize before comparing.
const normSwid = (s?: string | null) => (s ?? '').replace(/[{}]/g, '').toUpperCase();
function myTeamIdFrom(raw: any, swid?: string): number | null {
  const mine = normSwid(swid);
  if (!mine) return null;
  for (const t of raw.teams ?? []) {
    const owners = (t.owners ?? [t.primaryOwner]).filter(Boolean).map((o: string) => normSwid(o));
    if (owners.includes(mine)) return t.id;
  }
  return null;
}

// Fetches and normalizes an ESPN league into the shape every /espn page renders.
export async function loadEspnLeague(leagueId: string, season: string): Promise<EspnLoadResult> {
  const { cookie: cookieHeader, swid } = await resolveEspnAuth();
  const result = await fetchLeague(leagueId, season, cookieHeader);
  if ('error' in result) return result;
  const raw = result.data;

  // ── Settings ──
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

  const benchCount = slotCounts['20'] ?? 0;
  const irCount    = slotCounts['21'] ?? 0;

  const keyScoring = [
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

  // ── Teams ──
  const teams: EspnTeam[] = (raw.teams ?? []).map((t: any) => {
    const wins   = t.record?.overall?.wins   ?? 0;
    const losses = t.record?.overall?.losses ?? 0;
    const ties   = t.record?.overall?.ties   ?? 0;
    const gp     = wins + losses + ties;
    return {
      id:      t.id,
      // Newer ESPN seasons return a single `name`; older ones split it into
      // location + nickname. Fall back to the abbreviation only as a last resort.
      name:    (t.name ?? '').trim()
            || `${t.location ?? ''} ${t.nickname ?? ''}`.trim()
            || t.abbrev,
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
        id:     e.playerId ?? e.playerPoolEntry?.player?.id ?? e.playerPoolEntry?.playerPoolEntry?.player?.id ?? 0,
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

  // ── Schedule ──
  const byWeek = new Map<number, EspnMatchup[]>();
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

  // ── Managers ──
  const managers: EspnManager[] = (raw.members ?? [])
    .map((m: any) => ({
      id: m.id,
      displayName: m.displayName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Manager',
      isLeagueManager: !!m.isLeagueManager,
    }))
    .sort((a: EspnManager, b: EspnManager) => Number(b.isLeagueManager) - Number(a.isLeagueManager));

  // ── Recent trades ──
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

  const recentTrades: EspnRecentTrade[] = ((raw.transactions ?? []) as any[])
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

  // ── Summary stats ──
  const highScorer = standings[0];
  const allPts     = teams.map(t => t.pf);
  const leagueAvg  = allPts.length ? allPts.reduce((a, b) => a + b, 0) / allPts.length : 0;
  const highestWeeklyPts = Math.max(
    ...Array.from(byWeek.values()).flat().flatMap(m => [m.home.pts, m.away.pts]).filter(p => p > 0),
    0,
  );

  const leagueName = raw.settings?.name ?? 'ESPN League';

  // ESPN keeps the same league id across seasons; status.previousSeasons lists
  // the years it has existed. Newest first for the picker.
  const availableSeasons = [
    ...new Set([
      ...((raw.status?.previousSeasons ?? []) as any[]).map((s) => String(s)),
      String(raw.seasonId ?? season),
    ]),
  ].sort((a, b) => Number(b) - Number(a));

  return {
    data: {
      leagueId, season, leagueName, scoringLabel,
      playoffTeams, regularWeeks, totalWeeks, currentPeriod, availableSeasons,
      myTeamId: myTeamIdFrom(raw, swid),
      rosterSlots, benchCount, irCount, keyScoring,
      teams, standings, teamById, byWeek, scheduleWeeks,
      managers, recentTrades, highScorer, leagueAvg, highestWeeklyPts,
    },
  };
}

// ─── Franchises (multi-season) ──────────────────────────────────────────────
// A "franchise" is an owner (ESPN member SWID) tracked across every season the
// league has existed — team names/ids change year to year, the owner doesn't.

export type FranchiseTrophy = { type: string; label: string; description: string; value: string | null };
export type FranchiseRival = { oppOwnerId: string; oppName: string; wins: number; losses: number; ties: number; played: number };
export type FranchiseSeason = {
  season: string; teamName: string;
  wins: number; losses: number; ties: number;
  pf: number; rank: number; seed: number | null; champion: boolean;
};
export type EspnFranchise = {
  ownerId: string;
  name: string;          // most recent team name
  managerName: string;   // owner display name
  seasonsPlayed: number;
  wins: number; losses: number; ties: number;
  pf: number; pa: number;
  championships: number;
  trophies: FranchiseTrophy[];
  rivals: FranchiseRival[];
  seasons: FranchiseSeason[];
};

export type EspnFranchisesResult =
  | { data: { leagueName: string; availableSeasons: string[]; seasonsLoaded: string[]; franchises: EspnFranchise[]; myOwnerId: string | null } }
  | { error: 'private' | 'notfound' };

const MAX_FRANCHISE_SEASONS = 12;

export async function loadEspnFranchises(leagueId: string, startSeason: string): Promise<EspnFranchisesResult> {
  const { cookie: cookieHeader, swid } = await resolveEspnAuth();

  const first = await fetchLeague(leagueId, startSeason, cookieHeader);
  if ('error' in first) return first;
  const raw0 = first.data;

  const availableSeasons = [
    ...new Set([
      ...((raw0.status?.previousSeasons ?? []) as any[]).map((s) => String(s)),
      String(raw0.seasonId ?? startSeason),
    ]),
  ].sort((a, b) => Number(b) - Number(a));

  const seasonsToLoad = availableSeasons.slice(0, MAX_FRANCHISE_SEASONS);

  const rawBySeason = new Map<string, any>();
  rawBySeason.set(String(raw0.seasonId ?? startSeason), raw0);
  const missing = seasonsToLoad.filter((s) => !rawBySeason.has(s));
  const fetched = await Promise.all(
    missing.map((s) =>
      fetchLeague(leagueId, s, cookieHeader)
        .then((r) => ('data' in r ? { s, raw: r.data } : null))
        .catch(() => null)
    )
  );
  for (const f of fetched) if (f) rawBySeason.set(f.s, f.raw);

  type Agg = {
    ownerId: string; managerName: string; latestName: string; latestSeason: number;
    wins: number; losses: number; ties: number; pf: number; pa: number; championships: number;
    trophies: FranchiseTrophy[];
    seasons: FranchiseSeason[];
    rivals: Map<string, { wins: number; losses: number; ties: number; played: number }>;
  };
  const agg = new Map<string, Agg>();
  const ownerName = new Map<string, string>();
  const getAgg = (ownerId: string): Agg => {
    if (!agg.has(ownerId)) {
      agg.set(ownerId, {
        ownerId, managerName: ownerName.get(ownerId) ?? 'Manager', latestName: '', latestSeason: 0,
        wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, championships: 0,
        trophies: [], seasons: [], rivals: new Map(),
      });
    }
    return agg.get(ownerId)!;
  };
  const rivalRec = (a: Agg, oppId: string) => {
    if (!a.rivals.has(oppId)) a.rivals.set(oppId, { wins: 0, losses: 0, ties: 0, played: 0 });
    return a.rivals.get(oppId)!;
  };

  const sortedSeasons = [...rawBySeason.keys()].sort((a, b) => Number(a) - Number(b));

  for (const seasonKey of sortedSeasons) {
    const raw = rawBySeason.get(seasonKey);
    const seasonNum = Number(seasonKey);

    for (const m of raw.members ?? []) {
      const name = m.displayName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Manager';
      ownerName.set(m.id, name);
    }

    const teams: { teamId: number; ownerId: string; name: string; wins: number; losses: number; ties: number; pf: number; pa: number }[] =
      (raw.teams ?? []).map((t: any) => ({
        teamId: t.id,
        ownerId: t.primaryOwner ?? (t.owners ?? [])[0] ?? `team-${t.id}`,
        name: (t.name ?? '').trim() || `${t.location ?? ''} ${t.nickname ?? ''}`.trim() || t.abbrev || `Team ${t.id}`,
        wins: t.record?.overall?.wins ?? 0,
        losses: t.record?.overall?.losses ?? 0,
        ties: t.record?.overall?.ties ?? 0,
        pf: t.record?.overall?.pointsFor ?? 0,
        pa: t.record?.overall?.pointsAgainst ?? 0,
      }));
    if (teams.length === 0) continue;

    const ownerByTeam = new Map(teams.map((t) => [t.teamId, t.ownerId]));
    const standings = [...teams].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
    const rankByTeam = new Map(standings.map((t, i) => [t.teamId, i + 1]));
    const playoffTeams: number = raw.settings?.scheduleSettings?.playoffTeamCount ?? 0;
    const championTeamId: number = raw.status?.teamChampionId ?? 0;
    const pfLeaderId = standings.reduce((best, t) => (t.pf > (best?.pf ?? -1) ? t : best), standings[0])?.teamId;

    for (const t of teams) {
      const a = getAgg(t.ownerId);
      a.managerName = ownerName.get(t.ownerId) ?? a.managerName;
      if (seasonNum >= a.latestSeason) { a.latestSeason = seasonNum; a.latestName = t.name; }
      a.wins += t.wins; a.losses += t.losses; a.ties += t.ties; a.pf += t.pf; a.pa += t.pa;

      const rank = rankByTeam.get(t.teamId) ?? 0;
      const seed = playoffTeams > 0 && rank <= playoffTeams ? rank : null;
      const isChamp = championTeamId > 0 && t.teamId === championTeamId;
      if (isChamp) a.championships++;
      a.seasons.push({ season: seasonKey, teamName: t.name, wins: t.wins, losses: t.losses, ties: t.ties, pf: t.pf, rank, seed, champion: isChamp });

      if (isChamp) a.trophies.push({ type: 'champion', label: `${seasonKey} Champion`, description: 'Won the league', value: null });
      if (rank === 1) a.trophies.push({ type: 'first', label: `${seasonKey} #1 Seed`, description: 'Best regular-season record', value: null });
      if (t.teamId === pfLeaderId) a.trophies.push({ type: 'points', label: `${seasonKey} Points Leader`, description: 'Most points that season', value: `${t.pf.toFixed(0)} PF` });
      if (seed != null && rank !== 1) a.trophies.push({ type: 'playoff', label: `${seasonKey} Playoffs`, description: `Made the playoffs (#${rank} seed)`, value: null });
    }

    // Head-to-head for the season, attributed to owners. `winner` is in the
    // mSchedule view; totalPoints often isn't, so use winner as the source of
    // truth and only fall back to points when needed.
    for (const mm of raw.schedule ?? []) {
      const hId = mm.home?.teamId, aId = mm.away?.teamId;
      const winner: string = mm.winner ?? 'UNDECIDED';
      const hPts = mm.home?.totalPoints ?? 0, aPts = mm.away?.totalPoints ?? 0;
      const decided = winner !== 'UNDECIDED' || hPts > 0 || aPts > 0;
      if (hId == null || aId == null || !decided) continue;
      const hOwner = ownerByTeam.get(hId), aOwner = ownerByTeam.get(aId);
      if (!hOwner || !aOwner || hOwner === aOwner) continue;
      const hr = rivalRec(getAgg(hOwner), aOwner);
      const ar = rivalRec(getAgg(aOwner), hOwner);
      hr.played++; ar.played++;
      const homeWon = winner === 'HOME' || (winner === 'UNDECIDED' && hPts > aPts);
      const awayWon = winner === 'AWAY' || (winner === 'UNDECIDED' && aPts > hPts);
      if (homeWon) { hr.wins++; ar.losses++; }
      else if (awayWon) { hr.losses++; ar.wins++; }
      else { hr.ties++; ar.ties++; }
    }
  }

  const franchises: EspnFranchise[] = [...agg.values()]
    .map((a) => ({
      ownerId: a.ownerId,
      name: a.latestName || a.managerName,
      managerName: a.managerName,
      seasonsPlayed: a.seasons.length,
      wins: a.wins, losses: a.losses, ties: a.ties, pf: a.pf, pa: a.pa,
      championships: a.championships,
      trophies: a.trophies.sort((x, y) => (y.label > x.label ? 1 : -1)),
      rivals: [...a.rivals.entries()]
        .map(([oppOwnerId, r]) => ({ oppOwnerId, oppName: ownerName.get(oppOwnerId) ?? 'Manager', ...r }))
        .sort((x, y) => y.played - x.played || x.oppName.localeCompare(y.oppName)),
      seasons: a.seasons.sort((x, y) => Number(y.season) - Number(x.season)),
    }))
    .sort((a, b) => b.championships - a.championships || b.wins - a.wins);

  const mine = normSwid(swid);
  const myOwnerId = mine ? (franchises.find((fr) => normSwid(fr.ownerId) === mine)?.ownerId ?? null) : null;

  return {
    data: {
      leagueName: raw0.settings?.name ?? 'ESPN League',
      availableSeasons,
      seasonsLoaded: sortedSeasons.sort((a, b) => Number(b) - Number(a)),
      franchises,
      myOwnerId,
    },
  };
}
