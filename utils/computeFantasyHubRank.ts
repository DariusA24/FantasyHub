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

export async function computeFantasyHubRank(sleeperUserId: string): Promise<{
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

export function getTierStyle(tier: RankTierName) {
  return RANK_TIERS.find((t) => t.name === tier) ?? {
    name: "Unranked",
    color: "#6B7280",
    bg: "bg-zinc-800/40",
    border: "border-zinc-700/40",
    text: "text-zinc-500",
  };
}
