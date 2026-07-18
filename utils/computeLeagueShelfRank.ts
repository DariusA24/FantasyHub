import { prisma } from "./db";

export const RANK_TIERS = [
  { name: "Legend",  min: 80, color: "#F4D06F",  bg: "bg-[#F4D06F]/10",  border: "border-[#F4D06F]/40",  text: "text-[#F4D06F]"  },
  { name: "Elite",   min: 65, color: "#A78BFA",  bg: "bg-purple-500/10", border: "border-purple-500/40", text: "text-purple-400" },
  { name: "Pro",     min: 45, color: "#60A5FA",  bg: "bg-blue-500/10",   border: "border-blue-500/40",   text: "text-blue-400"   },
  { name: "Veteran", min: 25, color: "#34D399",  bg: "bg-emerald-500/10",border: "border-emerald-500/40",text: "text-emerald-400"},
  { name: "Rookie",  min: 0,  color: "#9CA3AF",  bg: "bg-zinc-500/10",   border: "border-zinc-500/40",   text: "text-zinc-400"   },
] as const;

export type RankTierName = typeof RANK_TIERS[number]["name"] | "Unranked";

export const MIN_SEASONS = 2;

// Points per season:
//   champion   → 100
//   runner_up  → 65
//   toilet_bowl→ 10
//   no award   → rank-percentile: 10 + 55 * (1 - (rank-1)/(total-1))
//                rank 1/10 → 65, rank 5/10 → 37, rank 10/10 → 10

export async function computeLeagueShelfRank(sleeperUserId: string): Promise<{
  tier: RankTierName;
  score: number | null;
  seasons: number;
}> {
  const currentYear = new Date().getFullYear().toString();

  const userStats = await prisma.hubLeagueSeasonStat.findMany({
    where: { sleeperUserId, season: { not: currentYear } },
  });

  if (userStats.length < MIN_SEASONS) {
    return { tier: "Unranked", score: null, seasons: userStats.length };
  }

  // Batch: all playoff awards for this user across those seasons
  const awards = await prisma.hubLeagueAward.findMany({
    where: {
      sleeperUserId,
      season: { not: currentYear },
      type: { in: ["champion", "runner_up", "toilet_bowl"] },
    },
    select: { hubLeagueId: true, season: true, type: true },
  });
  const awardMap = new Map(awards.map((a) => [`${a.hubLeagueId}|${a.season}`, a.type]));

  // Batch: all stats for those hub leagues to compute team counts
  const hubLeagueIds = [...new Set(userStats.map((s) => s.hubLeagueId))];
  const allStats = await prisma.hubLeagueSeasonStat.findMany({
    where: { hubLeagueId: { in: hubLeagueIds }, season: { not: currentYear } },
    select: { hubLeagueId: true, season: true },
  });
  const teamCountMap = new Map<string, number>();
  for (const s of allStats) {
    const key = `${s.hubLeagueId}|${s.season}`;
    teamCountMap.set(key, (teamCountMap.get(key) ?? 0) + 1);
  }

  const seasonScores: number[] = [];
  for (const stat of userStats) {
    const key = `${stat.hubLeagueId}|${stat.season}`;
    const award = awardMap.get(key);

    let score: number;
    if (award === "champion") {
      score = 100;
    } else if (award === "runner_up") {
      score = 65;
    } else if (award === "toilet_bowl") {
      score = 10;
    } else if (stat.rank != null) {
      const total = teamCountMap.get(key) ?? 1;
      score = Math.round(10 + 55 * (1 - (stat.rank - 1) / Math.max(total - 1, 1)));
    } else {
      continue;
    }

    seasonScores.push(score);
  }

  if (seasonScores.length < MIN_SEASONS) {
    return { tier: "Unranked", score: null, seasons: seasonScores.length };
  }

  const avg = Math.round(seasonScores.reduce((a, b) => a + b, 0) / seasonScores.length);
  const tier = (RANK_TIERS.find((t) => avg >= t.min)?.name ?? "Rookie") as RankTierName;

  return { tier, score: avg, seasons: seasonScores.length };
}

export type GlobalRank = {
  tier: RankTierName;
  score: number | null;
  seasons: number;
  position: number | null;   // 1-based; ties share the same position
  totalRanked: number;
};

export type LeaderboardEntry = {
  key: string;               // "p:<profileId>" for LeagueShelf accounts, "s:<sleeperUserId>" otherwise
  profileId: number | null;  // set when the entry belongs to a LeagueShelf account
  sleeperUserIds: string[];  // platform identities folded into this entry
  score: number;
  seasons: number;
  tier: RankTierName;
  position: number;          // 1-based; ties share the same position
};

// Per-season career scores for every identity, using the same formula as
// computeLeagueShelfRank (current season excluded). Identities aggregate by
// LeagueShelf profile when one is linked — so a member's seasons across
// platforms (Sleeper today, ESPN/Yahoo later) merge into one career — and fall
// back to the platform user id for unlinked managers.
async function buildCareerScores(): Promise<
  Map<string, { profileId: number | null; sleeperUserIds: Set<string>; scores: number[] }>
> {
  const currentYear = new Date().getFullYear().toString();

  const [allStats, awards] = await Promise.all([
    prisma.hubLeagueSeasonStat.findMany({
      where: { season: { not: currentYear } },
      select: { hubLeagueId: true, season: true, sleeperUserId: true, profileId: true, rank: true },
    }),
    prisma.hubLeagueAward.findMany({
      where: {
        season: { not: currentYear },
        type: { in: ["champion", "runner_up", "toilet_bowl"] },
      },
      select: { hubLeagueId: true, season: true, type: true, sleeperUserId: true },
    }),
  ]);

  const awardMap = new Map(
    awards.map((a) => [`${a.hubLeagueId}|${a.season}|${a.sleeperUserId}`, a.type])
  );

  const teamCountMap = new Map<string, number>();
  for (const s of allStats) {
    const key = `${s.hubLeagueId}|${s.season}`;
    teamCountMap.set(key, (teamCountMap.get(key) ?? 0) + 1);
  }

  // Older stat rows may predate a user linking their account; fold every row
  // for a sleeper id into the profile as soon as any row carries the link.
  const profileBySleeper = new Map<string, number>();
  for (const s of allStats) {
    if (s.profileId != null) profileBySleeper.set(s.sleeperUserId, s.profileId);
  }

  const entries = new Map<string, { profileId: number | null; sleeperUserIds: Set<string>; scores: number[] }>();
  for (const stat of allStats) {
    const leagueKey = `${stat.hubLeagueId}|${stat.season}`;
    const award = awardMap.get(`${leagueKey}|${stat.sleeperUserId}`);

    let score: number;
    if (award === "champion") {
      score = 100;
    } else if (award === "runner_up") {
      score = 65;
    } else if (award === "toilet_bowl") {
      score = 10;
    } else if (stat.rank != null) {
      const total = teamCountMap.get(leagueKey) ?? 1;
      score = Math.round(10 + 55 * (1 - (stat.rank - 1) / Math.max(total - 1, 1)));
    } else {
      continue;
    }

    const profileId = stat.profileId ?? profileBySleeper.get(stat.sleeperUserId) ?? null;
    const key = profileId != null ? `p:${profileId}` : `s:${stat.sleeperUserId}`;
    const entry = entries.get(key) ?? { profileId, sleeperUserIds: new Set<string>(), scores: [] };
    entry.sleeperUserIds.add(stat.sleeperUserId);
    entry.scores.push(score);
    entries.set(key, entry);
  }

  return entries;
}

// Full global leaderboard, best score first. Only identities with enough
// completed seasons are included.
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const careerScores = await buildCareerScores();

  const entries: LeaderboardEntry[] = [];
  for (const [key, { profileId, sleeperUserIds, scores }] of careerScores) {
    if (scores.length < MIN_SEASONS) continue;
    const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    entries.push({
      key,
      profileId,
      sleeperUserIds: [...sleeperUserIds],
      score,
      seasons: scores.length,
      tier: (RANK_TIERS.find((t) => score >= t.min)?.name ?? "Rookie") as RankTierName,
      position: 0,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => {
    e.position = i > 0 && entries[i - 1].score === e.score ? entries[i - 1].position : i + 1;
  });

  return entries;
}

// Global career rank: places the given user on the leaderboard.
export async function computeGlobalLeagueShelfRank(sleeperUserId: string): Promise<GlobalRank> {
  const leaderboard = await getGlobalLeaderboard();
  const mine = leaderboard.find((e) => e.sleeperUserIds.includes(sleeperUserId));
  if (!mine) {
    return { tier: "Unranked", score: null, seasons: 0, position: null, totalRanked: leaderboard.length };
  }
  return { tier: mine.tier, score: mine.score, seasons: mine.seasons, position: mine.position, totalRanked: leaderboard.length };
}

export function getTierStyle(tier: RankTierName) {
  return RANK_TIERS.find((t) => t.name === tier) ?? {
    name: "Unranked",
    color: "#6B7280",
    bg: "bg-zinc-800/40",
    border: "border-zinc-700/40",
    text: "text-zinc-500",
  };
}
