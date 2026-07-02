import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // grading can take a few seconds with many matchups

// ─── Tier logic ───────────────────────────────────────────────────────────────

function calculateTier(totalVotes: number, accuracy: number): string {
  if (totalVotes >= 50 && accuracy >= 0.70) return "legend";
  if (totalVotes >= 30 && accuracy >= 0.60) return "expert";
  if (totalVotes >= 10 && accuracy >= 0.50) return "analyst";
  return "rookie";
}

// ─── Recalculate one user's stats from their full vote history ────────────────

async function recalculateStat(profileId: number) {
  const votes = await prisma.startSitVote.findMany({
    where: { profileId, correct: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { correct: true },
  });

  const totalVotes   = votes.length;
  const correctPicks = votes.filter((v) => v.correct === true).length;
  const accuracy     = totalVotes > 0 ? correctPicks / totalVotes : 0;

  // Current streak: consecutive correct picks from the most recent
  let streak = 0;
  for (const v of votes) {
    if (v.correct === true) streak++;
    else break;
  }

  // Best streak: longest correct run across all history
  let bestStreak = 0;
  let run = 0;
  for (const v of [...votes].reverse()) {
    if (v.correct === true) { run++; bestStreak = Math.max(bestStreak, run); }
    else run = 0;
  }

  const tier = calculateTier(totalVotes, accuracy);

  await prisma.userPredictionStat.upsert({
    where: { profileId },
    create: { profileId, totalVotes, correctPicks, streak, bestStreak, tier },
    update: { totalVotes, correctPicks, streak, bestStreak, tier },
  });
}

// ─── Core grading logic ───────────────────────────────────────────────────────

async function gradeWeek(week: number, season: string) {
  // 1. Fetch actual stats from Sleeper
  const statsRes = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!statsRes.ok) throw new Error(`Sleeper stats error: ${statsRes.status}`);
  const stats = await statsRes.json() as Record<string, { pts_ppr?: number }>;

  // 2. Find all matchups for this week that have at least one ungraded vote
  const matchups = await prisma.startSitMatchup.findMany({
    where: { week, season },
    include: {
      votes: {
        where: { correct: null },
        select: { id: true, profileId: true, chosenPlayerId: true },
      },
    },
  });

  const affectedProfileIds = new Set<number>();
  let totalGraded = 0;

  for (const matchup of matchups) {
    if (matchup.votes.length === 0) continue;

    // Parse player IDs back from the key (sorted numeric Sleeper IDs joined by "_")
    const playerIds = matchup.playerKey.split("_");

    // Get actual pts_ppr for each player (default 0 if not found — e.g. bye week)
    const pts: Record<string, number> = {};
    for (const id of playerIds) {
      pts[id] = stats[id]?.pts_ppr ?? 0;
    }

    const topScore = Math.max(...Object.values(pts));

    // In case of a tie, any player who tied is considered a winner
    const winners = new Set(playerIds.filter((id) => pts[id] === topScore));

    // Grade each ungraded vote
    const updates = matchup.votes.map((vote) =>
      prisma.startSitVote.update({
        where: { id: vote.id },
        data: { correct: winners.has(vote.chosenPlayerId) },
      })
    );
    await Promise.all(updates);

    for (const vote of matchup.votes) {
      affectedProfileIds.add(vote.profileId);
      totalGraded++;
    }
  }

  // 3. Recalculate stats for every user who had a vote graded
  await Promise.all([...affectedProfileIds].map(recalculateStat));

  return { graded: totalGraded, usersUpdated: affectedProfileIds.size };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // require secret to be set
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// GET — called by Vercel cron (auto-detects last completed week)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Determine which week just finished
    const stateRes = await fetch("https://api.sleeper.app/v1/state/nfl");
    if (!stateRes.ok) throw new Error("Could not fetch NFL state");
    const state = await stateRes.json() as { week: number; display_week: number; season: string; season_type: string };

    if (state.season_type !== "regular") {
      return NextResponse.json({ message: "Not regular season — no grading needed", season_type: state.season_type });
    }

    // Cron fires Tuesday morning; Sleeper typically rolls week forward by then,
    // so the last completed week is display_week - 1
    const weekToGrade = state.display_week - 1;
    if (weekToGrade < 1) {
      return NextResponse.json({ message: "No completed week to grade yet" });
    }

    const result = await gradeWeek(weekToGrade, state.season);
    return NextResponse.json({ week: weekToGrade, season: state.season, ...result });
  } catch (e: any) {
    console.error("[start-sit/grade GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST — manual trigger (admin use: pass week + season explicitly)
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const week   = Number(body.week);
    const season = String(body.season);

    if (!week || week < 1 || week > 18 || !season) {
      return NextResponse.json({ error: "Invalid week or season" }, { status: 400 });
    }

    const result = await gradeWeek(week, season);
    return NextResponse.json({ week, season, ...result });
  } catch (e: any) {
    console.error("[start-sit/grade POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
