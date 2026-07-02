import { prisma } from "@/utils/db";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sleeper API error for ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  settings: { wins: number; losses: number; ties: number; fpts: number; fpts_decimal: number };
}
interface SleeperMatchup { roster_id: number; points: number; matchup_id: number | null }
interface SleeperUser { user_id: string; display_name: string; avatar?: string | null; metadata?: { team_name?: string } }

function displayName(user: SleeperUser): string {
  return user.metadata?.team_name || user.display_name;
}

function avatarUrl(user: SleeperUser): string | null {
  return user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null;
}

/**
 * Computes and upserts per-manager season stats (W-L, PF, PA, high/low week, rank)
 * AND head-to-head records for a single Sleeper league season.
 * Returns the number of season-stat rows upserted.
 */
export async function computeSeasonStatsForSeason(
  hubLeagueId: string,
  sleeperLeagueId: string,
  season: string
): Promise<number> {
  const MAX_WEEKS = 18;

  const [rosters, users] = await Promise.all([
    sleeperFetch<SleeperRoster[]>(`/league/${sleeperLeagueId}/rosters`),
    sleeperFetch<SleeperUser[]>(`/league/${sleeperLeagueId}/users`),
  ]);

  // Fetch all weeks in parallel
  const matchupsByWeek = new Map<number, SleeperMatchup[]>();
  await Promise.all(
    Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map(async (week) => {
      const matchups = await fetch(`${SLEEPER_BASE}/league/${sleeperLeagueId}/matchups/${week}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<SleeperMatchup[]>) : [] as SleeperMatchup[]))
        .catch(() => [] as SleeperMatchup[]);
      matchupsByWeek.set(week, matchups ?? []);
    })
  );

  const rosterOwnerMap = new Map<number, string>(
    rosters.filter((r) => r.owner_id).map((r) => [r.roster_id, r.owner_id!])
  );
  const userDisplayMap = new Map<string, string>(users.map((u) => [u.user_id, displayName(u)]));
  const userAvatarMap = new Map<string, string | null>(users.map((u) => [u.user_id, avatarUrl(u)]));

  // Per-roster: weekly scores, PA, and H2H records
  const rosterWeeklyScores = new Map<number, number[]>();
  const rosterPA = new Map<number, number>();
  // h2h[userId][opponentId] = { wins, losses, ties }
  const h2h = new Map<string, Map<string, { wins: number; losses: number; ties: number }>>();

  function getH2H(userId: string, opponentId: string) {
    if (!h2h.has(userId)) h2h.set(userId, new Map());
    const inner = h2h.get(userId)!;
    if (!inner.has(opponentId)) inner.set(opponentId, { wins: 0, losses: 0, ties: 0 });
    return inner.get(opponentId)!;
  }

  for (let week = 1; week <= MAX_WEEKS; week++) {
    const weekMatchups = matchupsByWeek.get(week) ?? [];
    if (weekMatchups.length === 0) continue;

    for (const m of weekMatchups) {
      if (m.points == null) continue;
      if (!rosterWeeklyScores.has(m.roster_id)) rosterWeeklyScores.set(m.roster_id, []);
      rosterWeeklyScores.get(m.roster_id)!.push(m.points);
    }

    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of weekMatchups) {
      if (!m.matchup_id) continue;
      if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, []);
      byMatchupId.get(m.matchup_id)!.push(m);
    }

    for (const [, pair] of byMatchupId) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;

      // PA
      rosterPA.set(a.roster_id, (rosterPA.get(a.roster_id) ?? 0) + (b.points ?? 0));
      rosterPA.set(b.roster_id, (rosterPA.get(b.roster_id) ?? 0) + (a.points ?? 0));

      // H2H
      const ownerA = rosterOwnerMap.get(a.roster_id);
      const ownerB = rosterOwnerMap.get(b.roster_id);
      if (ownerA && ownerB) {
        if (a.points > b.points) {
          getH2H(ownerA, ownerB).wins++;
          getH2H(ownerB, ownerA).losses++;
        } else if (b.points > a.points) {
          getH2H(ownerB, ownerA).wins++;
          getH2H(ownerA, ownerB).losses++;
        } else {
          getH2H(ownerA, ownerB).ties++;
          getH2H(ownerB, ownerA).ties++;
        }
      }
    }
  }

  // Rank rosters by wins DESC, then fpts DESC
  const rankedRosters = [...rosters]
    .filter((r) => r.owner_id)
    .sort((a, b) => {
      const wDiff = (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0);
      if (wDiff !== 0) return wDiff;
      const aFpts = (a.settings?.fpts ?? 0) + (a.settings?.fpts_decimal ?? 0) / 100;
      const bFpts = (b.settings?.fpts ?? 0) + (b.settings?.fpts_decimal ?? 0) / 100;
      return bFpts - aFpts;
    });

  const rankMap = new Map<number, number>();
  rankedRosters.forEach((r, i) => rankMap.set(r.roster_id, i + 1));

  // Resolve profileIds
  const ownerIds = rosters.map((r) => r.owner_id).filter(Boolean) as string[];
  const linkedProfiles = await prisma.profile.findMany({
    where: { sleeperProfileId: { in: ownerIds } },
    select: { id: true, sleeperProfileId: true },
  });
  const sleeperToProfileId = new Map<string, number>(
    linkedProfiles.map((p) => [p.sleeperProfileId!, p.id])
  );

  // Upsert season stats
  let count = 0;
  for (const roster of rosters) {
    if (!roster.owner_id) continue;

    const { wins = 0, losses = 0, ties = 0, fpts = 0, fpts_decimal = 0 } = roster.settings ?? {};
    const pointsFor = fpts + fpts_decimal / 100;
    const pointsAgainst = rosterPA.get(roster.roster_id) ?? 0;
    const weekly = rosterWeeklyScores.get(roster.roster_id) ?? [];
    const played = weekly.filter((s) => s > 0);
    const highWeek = played.length > 0 ? Math.max(...played) : 0;
    const lowWeek = played.length > 0 ? Math.min(...played) : 0;
    const rank = rankMap.get(roster.roster_id) ?? null;
    const profileId = sleeperToProfileId.get(roster.owner_id) ?? null;

    await prisma.hubLeagueSeasonStat.upsert({
      where: { hubLeagueId_season_sleeperUserId: { hubLeagueId, season, sleeperUserId: roster.owner_id } },
      create: { hubLeagueId, season, sleeperUserId: roster.owner_id, profileId, wins, losses, ties, pointsFor, pointsAgainst, highWeek, lowWeek, rank },
      update: { profileId, wins, losses, ties, pointsFor, pointsAgainst, highWeek, lowWeek, rank },
    });
    count++;
  }

  // Upsert H2H records
  for (const [userId, opponents] of h2h.entries()) {
    for (const [opponentId, record] of opponents.entries()) {
      const opponentName = userDisplayMap.get(opponentId) ?? opponentId;
      const opponentAvatar = userAvatarMap.get(opponentId) ?? null;
      await prisma.hubLeagueH2H.upsert({
        where: { hubLeagueId_season_sleeperUserId_opponentUserId: { hubLeagueId, season, sleeperUserId: userId, opponentUserId: opponentId } },
        create: { hubLeagueId, season, sleeperUserId: userId, opponentUserId: opponentId, opponentDisplayName: opponentName, opponentAvatar, ...record },
        update: { opponentDisplayName: opponentName, opponentAvatar, ...record },
      });
    }
  }

  return count;
}
