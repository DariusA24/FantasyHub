import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { wagerPayout } from "@/utils/bettingLines";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SLEEPER = "https://api.sleeper.app/v1";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// GET — called by Vercel cron Tuesday mornings, after Sleeper rolls the week
// forward. Settles every open line from completed weeks and pays out wagers.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stateRes = await fetch(`${SLEEPER}/state/nfl`);
    if (!stateRes.ok) throw new Error("Could not fetch NFL state");
    const state: { week: number; season: string; season_type: string } =
      await stateRes.json();

    // A line is settleable once its week is behind the current NFL week
    // (or it belongs to a past season entirely).
    const openLines = await prisma.betLine.findMany({
      where: {
        status: "open",
        OR: [
          { season: { lt: state.season } },
          { season: state.season, week: { lt: state.week } },
        ],
      },
      include: { wagers: { where: { status: "pending" } } },
    });

    if (openLines.length === 0) {
      return NextResponse.json({ message: "No lines to settle", settled: 0 });
    }

    // Fetch final matchup scores once per (sleeperLeagueId, week)
    const scoreCache = new Map<string, Map<number, number> | null>();
    async function finalScores(
      sleeperLeagueId: string,
      season: string,
      week: number
    ): Promise<Map<number, number> | null> {
      const key = `${sleeperLeagueId}:${season}:${week}`;
      if (scoreCache.has(key)) return scoreCache.get(key)!;

      let scores: Map<number, number> | null = null;
      try {
        const res = await fetch(
          `${SLEEPER}/league/${sleeperLeagueId}/matchups/${week}`,
          { signal: AbortSignal.timeout(15_000) }
        );
        if (res.ok) {
          const matchups: { roster_id: number; points?: number }[] = await res.json();
          scores = new Map(matchups.map((m) => [m.roster_id, m.points ?? 0]));
        }
      } catch (e) {
        console.error(`[settle-lines] failed to fetch matchups for ${key}:`, e);
      }
      scoreCache.set(key, scores);
      return scores;
    }

    let settled = 0;
    let voided = 0;
    let wagersGraded = 0;

    for (const line of openLines) {
      const scores = await finalScores(line.sleeperLeagueId, line.season, line.week);
      const homeScore = scores?.get(line.homeRosterId);
      const awayScore = scores?.get(line.awayRosterId);
      const now = new Date();

      // Scores unavailable — void the line and refund every stake
      if (scores === null || homeScore === undefined || awayScore === undefined) {
        await prisma.$transaction([
          prisma.betLine.update({
            where: { id: line.id },
            data: { status: "void", settledAt: now },
          }),
          ...line.wagers.map((w) =>
            prisma.betWager.update({
              where: { id: w.id },
              data: { status: "void", payout: w.stake, settledAt: now },
            })
          ),
          ...line.wagers.map((w) =>
            prisma.wallet.update({
              where: {
                hubLeagueId_profileId: {
                  hubLeagueId: line.hubLeagueId,
                  profileId: w.profileId,
                },
              },
              data: { balance: { increment: w.stake } },
            })
          ),
        ]);
        voided++;
        wagersGraded += line.wagers.length;
        continue;
      }

      const total = homeScore + awayScore;

      const gradeWager = (pick: string): "won" | "lost" | "push" => {
        switch (pick) {
          case "home":
            return homeScore > awayScore ? "won" : homeScore < awayScore ? "lost" : "push";
          case "away":
            return awayScore > homeScore ? "won" : awayScore < homeScore ? "lost" : "push";
          case "over":
            return total > line.totalLine ? "won" : total < line.totalLine ? "lost" : "push";
          default:
            return total < line.totalLine ? "won" : total > line.totalLine ? "lost" : "push";
        }
      };

      const updates = [];
      for (const w of line.wagers) {
        const result = gradeWager(w.pick);
        const payout =
          result === "won" ? wagerPayout(w.stake, w.odds) : result === "push" ? w.stake : 0;

        updates.push(
          prisma.betWager.update({
            where: { id: w.id },
            data: { status: result, payout, settledAt: now },
          })
        );
        if (payout > 0) {
          updates.push(
            prisma.wallet.update({
              where: {
                hubLeagueId_profileId: {
                  hubLeagueId: line.hubLeagueId,
                  profileId: w.profileId,
                },
              },
              data: { balance: { increment: payout } },
            })
          );
        }
      }

      await prisma.$transaction([
        prisma.betLine.update({
          where: { id: line.id },
          data: { status: "settled", homeScore, awayScore, settledAt: now },
        }),
        ...updates,
      ]);
      settled++;
      wagersGraded += line.wagers.length;
    }

    return NextResponse.json({
      season: state.season,
      week: state.week,
      settled,
      voided,
      wagersGraded,
    });
  } catch (e: any) {
    console.error("[settle-lines GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
