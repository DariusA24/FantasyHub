import { prisma } from "@/utils/db";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sleeper API error for ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

interface SleeperLeagueInfo {
  settings: { playoff_week_start: number; num_playoff_teams: number; leg: number };
  season: string;
}
interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  settings: { wins: number; losses: number; ties: number; fpts: number; fpts_decimal: number };
}
interface SleeperMatchup { roster_id: number; points: number; matchup_id: number | null }
interface SleeperUser { user_id: string; display_name: string; metadata?: { team_name?: string } }
interface SleeperTransaction { roster_ids: number[]; type: string }

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
}
function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Computes and upserts all awards for a single season.
 * Returns the number of awards upserted.
 */
export async function computeAwardsForSeason(
  hubLeagueId: string,
  sleeperLeagueId: string,
  season: string
): Promise<number> {
  const MAX_WEEKS = 18;

  const [leagueInfo, rosters, users] = await Promise.all([
    sleeperFetch<SleeperLeagueInfo>(`/league/${sleeperLeagueId}`),
    sleeperFetch<SleeperRoster[]>(`/league/${sleeperLeagueId}/rosters`),
    sleeperFetch<SleeperUser[]>(`/league/${sleeperLeagueId}/users`),
  ]);

  const playoffWeekStart: number = leagueInfo.settings.playoff_week_start ?? 15;
  const regularSeasonEnd = playoffWeekStart - 1;

  const matchupsByWeek = new Map<number, SleeperMatchup[]>();
  const transactionsByWeek = new Map<number, SleeperTransaction[]>();

  await Promise.all(
    Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map(async (week) => {
      const [matchups, transactions] = await Promise.all([
        fetch(`${SLEEPER_BASE}/league/${sleeperLeagueId}/matchups/${week}`, { cache: "no-store" })
          .then((r) => (r.ok ? (r.json() as Promise<SleeperMatchup[]>) : [] as SleeperMatchup[]))
          .catch(() => [] as SleeperMatchup[]),
        fetch(`${SLEEPER_BASE}/league/${sleeperLeagueId}/transactions/${week}`, { cache: "no-store" })
          .then((r) => (r.ok ? (r.json() as Promise<SleeperTransaction[]>) : [] as SleeperTransaction[]))
          .catch(() => [] as SleeperTransaction[]),
      ]);
      matchupsByWeek.set(week, matchups ?? []);
      transactionsByWeek.set(week, transactions ?? []);
    })
  );

  const userMap = new Map<string, SleeperUser>(users.map((u) => [u.user_id, u]));
  const rosterOwnerMap = new Map<number, string>(rosters.map((r) => [r.roster_id, r.owner_id ?? ""]));

  const allSleeperUserIds = Array.from(userMap.keys());
  const linkedProfiles = await prisma.profile.findMany({
    where: { sleeperProfileId: { in: allSleeperUserIds } },
    select: { id: true, sleeperProfileId: true },
  });
  const sleeperToProfileId = new Map<string, number>(
    linkedProfiles.map((p) => [p.sleeperProfileId!, p.id])
  );

  // Per-roster weekly scores
  const regularScores = new Map<number, number[]>();
  const allWeekScores = new Map<number, { week: number; points: number }[]>();

  for (let week = 1; week <= MAX_WEEKS; week++) {
    for (const m of matchupsByWeek.get(week) ?? []) {
      if (m.points == null) continue;
      if (!allWeekScores.has(m.roster_id)) allWeekScores.set(m.roster_id, []);
      allWeekScores.get(m.roster_id)!.push({ week, points: m.points });
      if (week <= regularSeasonEnd) {
        if (!regularScores.has(m.roster_id)) regularScores.set(m.roster_id, []);
        regularScores.get(m.roster_id)!.push(m.points);
      }
    }
  }

  // Transaction counts per roster
  const txCountByRoster = new Map<number, number>();
  for (let week = 1; week <= MAX_WEEKS; week++) {
    for (const tx of transactionsByWeek.get(week) ?? []) {
      for (const rid of tx.roster_ids ?? []) {
        txCountByRoster.set(rid, (txCountByRoster.get(rid) ?? 0) + 1);
      }
    }
  }

  function getDisplayName(ownerId: string): string {
    const u = userMap.get(ownerId);
    return u?.metadata?.team_name || u?.display_name || ownerId;
  }

  // Find last week with data
  let lastWeekWithData = 0;
  for (let week = MAX_WEEKS; week >= 1; week--) {
    if ((matchupsByWeek.get(week) ?? []).length > 0) { lastWeekWithData = week; break; }
  }

  // Championship
  let championshipWeek = 0;
  let championRosterId: number | null = null;
  let runnerUpRosterId: number | null = null;
  for (let week = lastWeekWithData; week >= playoffWeekStart; week--) {
    const champ = (matchupsByWeek.get(week) ?? []).filter((m) => m.matchup_id === 1);
    if (champ.length === 2) {
      championshipWeek = week;
      const [a, b] = champ;
      if (a.points >= b.points) { championRosterId = a.roster_id; runnerUpRosterId = b.roster_id; }
      else { championRosterId = b.roster_id; runnerUpRosterId = a.roster_id; }
      break;
    }
  }

  // Toilet bowl
  let toiletBowlRosterId: number | null = null;
  if (championshipWeek > 0) {
    const matchups = matchupsByWeek.get(championshipWeek) ?? [];
    const matchupIds = [...new Set(matchups.map((m) => m.matchup_id).filter(Boolean))] as number[];
    if (matchupIds.length > 1) {
      const lastMatchupId = Math.max(...matchupIds);
      const toiletGame = matchups.filter((m) => m.matchup_id === lastMatchupId);
      if (toiletGame.length === 2) {
        const [a, b] = toiletGame;
        toiletBowlRosterId = a.points >= b.points ? a.roster_id : b.roster_id;
      }
    }
  }

  // Best regular season
  let bestRegSeasonRosterId: number | null = null;
  let bestWins = -1, bestLosses = Infinity, bestFpts = -Infinity;
  for (const roster of rosters) {
    const { wins = 0, losses = 0, fpts = 0, fpts_decimal = 0 } = roster.settings ?? {};
    const totalFpts = fpts + fpts_decimal / 100;
    if (wins > bestWins || (wins === bestWins && losses < bestLosses) || (wins === bestWins && losses === bestLosses && totalFpts > bestFpts)) {
      bestWins = wins; bestLosses = losses; bestFpts = totalFpts; bestRegSeasonRosterId = roster.roster_id;
    }
  }

  // Highest week
  let highestWeekRosterId: number | null = null;
  let highestWeekScore = -Infinity, highestWeekNum = 0;
  for (const [rosterId, scores] of allWeekScores.entries()) {
    for (const { week, points } of scores) {
      if (points > highestWeekScore) { highestWeekScore = points; highestWeekRosterId = rosterId; highestWeekNum = week; }
    }
  }

  // Lowest PF
  let lowestPfRosterId: number | null = null;
  let lowestPfTotal = Infinity;
  for (const roster of rosters) {
    if (!roster.owner_id) continue;
    const { fpts = 0, fpts_decimal = 0 } = roster.settings ?? {};
    const totalFpts = fpts + fpts_decimal / 100;
    if (totalFpts < lowestPfTotal) { lowestPfTotal = totalFpts; lowestPfRosterId = roster.roster_id; }
  }

  // Most consistent
  let mostConsistentRosterId: number | null = null;
  let lowestStdDev = Infinity, mostConsistentMean = 0, mostConsistentStd = 0;
  for (const [rosterId, scores] of regularScores.entries()) {
    if (scores.length < 3) continue;
    const sd = stdDev(scores);
    if (sd < lowestStdDev) { lowestStdDev = sd; mostConsistentRosterId = rosterId; mostConsistentMean = avg(scores); mostConsistentStd = sd; }
  }

  // Most transactions
  let mostTxRosterId: number | null = null, mostTxCount = -1;
  for (const [rosterId, count] of txCountByRoster.entries()) {
    if (count > mostTxCount) { mostTxCount = count; mostTxRosterId = rosterId; }
  }

  // Biggest blowout
  let biggestBlowoutWinnerRosterId: number | null = null;
  let biggestBlowoutMargin = -Infinity, biggestBlowoutWeek = 0;
  for (let week = 1; week <= MAX_WEEKS; week++) {
    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of matchupsByWeek.get(week) ?? []) {
      if (!m.matchup_id) continue;
      if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, []);
      byMatchupId.get(m.matchup_id)!.push(m);
    }
    for (const [, pair] of byMatchupId) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      const margin = Math.abs(a.points - b.points);
      if (margin > biggestBlowoutMargin) {
        biggestBlowoutMargin = margin;
        biggestBlowoutWinnerRosterId = a.points >= b.points ? a.roster_id : b.roster_id;
        biggestBlowoutWeek = week;
      }
    }
  }

  // Build award list
  type AwardInput = { type: string; label: string; description: string; value?: string; week?: number; sleeperUserId: string };
  const awardsToUpsert: AwardInput[] = [];

  function addAward(rosterId: number | null, input: Omit<AwardInput, "sleeperUserId">) {
    if (rosterId == null) return;
    const ownerId = rosterOwnerMap.get(rosterId);
    if (!ownerId) return;
    awardsToUpsert.push({ ...input, sleeperUserId: ownerId });
  }

  if (bestRegSeasonRosterId != null) {
    const r = rosters.find((x) => x.roster_id === bestRegSeasonRosterId);
    const { wins = 0, losses = 0, ties = 0 } = r?.settings ?? {};
    const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
    const fpts = ((r?.settings?.fpts ?? 0) + (r?.settings?.fpts_decimal ?? 0) / 100).toFixed(1);
    addAward(bestRegSeasonRosterId, { type: "best_regular_season", label: "Best Regular Season", description: `${getDisplayName(rosterOwnerMap.get(bestRegSeasonRosterId) ?? "")} finished ${record} with ${fpts} total points`, value: record });
  }
  if (championRosterId != null) {
    const r = rosters.find((x) => x.roster_id === championRosterId);
    const { wins = 0, losses = 0, ties = 0 } = r?.settings ?? {};
    const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
    addAward(championRosterId, { type: "champion", label: "League Champion", description: `${getDisplayName(rosterOwnerMap.get(championRosterId) ?? "")} won the ${season} championship with a ${record} record`, value: record, week: championshipWeek || undefined });
  }
  if (runnerUpRosterId != null) {
    const r = rosters.find((x) => x.roster_id === runnerUpRosterId);
    const { wins = 0, losses = 0, ties = 0 } = r?.settings ?? {};
    const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
    addAward(runnerUpRosterId, { type: "runner_up", label: "Runner-Up", description: `${getDisplayName(rosterOwnerMap.get(runnerUpRosterId) ?? "")} made it to the championship game but fell short, finishing ${record}`, value: record, week: championshipWeek || undefined });
  }
  if (toiletBowlRosterId != null) {
    addAward(toiletBowlRosterId, { type: "toilet_bowl", label: "Toilet Bowl Champion", description: `${getDisplayName(rosterOwnerMap.get(toiletBowlRosterId) ?? "")} claimed the coveted last-place consolation trophy in ${season}`, week: championshipWeek || undefined });
  }
  if (highestWeekRosterId != null) {
    const scoreStr = highestWeekScore.toFixed(2);
    addAward(highestWeekRosterId, { type: "highest_week", label: "Highest Single Week", description: `${getDisplayName(rosterOwnerMap.get(highestWeekRosterId) ?? "")} scored ${scoreStr} points in Week ${highestWeekNum} — highest of the season`, value: `${scoreStr} pts`, week: highestWeekNum });
  }
  if (lowestPfRosterId != null) {
    const scoreStr = lowestPfTotal.toFixed(1);
    addAward(lowestPfRosterId, { type: "lowest_pf", label: "Lowest Points For", description: `${getDisplayName(rosterOwnerMap.get(lowestPfRosterId) ?? "")} scored only ${scoreStr} total points during the regular season`, value: `${scoreStr} pts` });
  }
  if (mostConsistentRosterId != null) {
    const avgStr = mostConsistentMean.toFixed(1);
    const stdStr = mostConsistentStd.toFixed(1);
    addAward(mostConsistentRosterId, { type: "most_consistent", label: "Most Consistent", description: `${getDisplayName(rosterOwnerMap.get(mostConsistentRosterId) ?? "")} averaged ${avgStr} pts/week with only ${stdStr} pt standard deviation`, value: `σ=${stdStr}` });
  }
  if (mostTxRosterId != null) {
    addAward(mostTxRosterId, { type: "most_transactions", label: "Most Active GM", description: `${getDisplayName(rosterOwnerMap.get(mostTxRosterId) ?? "")} made ${mostTxCount} roster moves this season — never stopped grinding`, value: `${mostTxCount} moves` });
  }
  if (biggestBlowoutWinnerRosterId != null) {
    const marginStr = biggestBlowoutMargin.toFixed(2);
    addAward(biggestBlowoutWinnerRosterId, { type: "biggest_blowout", label: "Biggest Blowout", description: `${getDisplayName(rosterOwnerMap.get(biggestBlowoutWinnerRosterId) ?? "")} won by ${marginStr} points in Week ${biggestBlowoutWeek} — largest margin of the season`, value: `+${marginStr} pts`, week: biggestBlowoutWeek });
  }

  // Upsert all awards
  let count = 0;
  for (const award of awardsToUpsert) {
    const profileId = sleeperToProfileId.get(award.sleeperUserId) ?? null;
    await prisma.hubLeagueAward.upsert({
      where: { hubLeagueId_season_type_sleeperUserId: { hubLeagueId, season, type: award.type, sleeperUserId: award.sleeperUserId } },
      create: { hubLeagueId, season, sleeperUserId: award.sleeperUserId, profileId, type: award.type, label: award.label, description: award.description, value: award.value ?? null, week: award.week ?? null },
      update: { profileId, label: award.label, description: award.description, value: award.value ?? null, week: award.week ?? null },
    });
    count++;
  }

  return count;
}
