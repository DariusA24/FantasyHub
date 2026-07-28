import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { wagerPayout } from "@/utils/bettingLines";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SLEEPER = "https://api.sleeper.app/v1";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

// GET — settles season futures once their season resolves. Win totals settle
// once the regular season is complete; champion outrights settle once the
// winners bracket has a champion. Runs weekly and no-ops until then.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stateRes = await fetch(`${SLEEPER}/state/nfl`);
    if (!stateRes.ok) throw new Error("Could not fetch NFL state");
    const state: { week: number; season: string } = await stateRes.json();

    const openFutures = await prisma.betFuture.findMany({
      where: { status: "open" },
      include: { options: true, wagers: { where: { status: "pending" } } },
    });
    if (openFutures.length === 0) {
      return NextResponse.json({ message: "No futures to settle", settled: 0 });
    }

    // Fetch each league's final standings + bracket once
    const leagueIds = [...new Set(openFutures.map((f) => f.sleeperLeagueId))];
    const leagueData = new Map<
      string,
      { wins: Map<number, number>; champion: number | null } | null
    >();
    await Promise.all(
      leagueIds.map(async (id) => {
        try {
          const [rostersRes, bracketRes] = await Promise.all([
            fetch(`${SLEEPER}/league/${id}/rosters`, { signal: AbortSignal.timeout(15_000) }),
            fetch(`${SLEEPER}/league/${id}/winners_bracket`, { signal: AbortSignal.timeout(15_000) }),
          ]);
          if (!rostersRes.ok) { leagueData.set(id, null); return; }
          const rosters: { roster_id: number; settings?: { wins?: number } }[] = await rostersRes.json();
          const wins = new Map(rosters.map((r) => [r.roster_id, r.settings?.wins ?? 0]));
          let champion: number | null = null;
          if (bracketRes.ok) {
            const bracket: { p?: number; w?: number | null }[] = await bracketRes.json();
            const final = Array.isArray(bracket) ? bracket.find((m) => m.p === 1) : null;
            champion = final?.w ?? null;
          }
          leagueData.set(id, { wins, champion });
        } catch {
          leagueData.set(id, null);
        }
      })
    );

    let settled = 0;
    let wagersGraded = 0;
    const now = new Date();

    for (const future of openFutures) {
      const data = leagueData.get(future.sleeperLeagueId);
      if (!data) continue;

      const seasonPassed = state.season > future.season;
      const regularSeasonDone =
        seasonPassed || Number(state.week) >= future.closesWeek;

      let winningOptionId: string | null = null;
      let result: string | null = null;
      let finalValue: number | null = null;

      if (future.kind === "win_total") {
        if (!regularSeasonDone || future.subjectRosterId == null || future.line == null) continue;
        const wins = data.wins.get(future.subjectRosterId);
        if (wins === undefined) continue;
        finalValue = wins;
        result = wins > future.line ? "over" : "under"; // half-point line, no push
        winningOptionId = future.options.find((o) => o.pick === result)?.id ?? null;
      } else {
        // champion — needs a decided bracket
        if (data.champion == null) continue;
        winningOptionId = future.options.find((o) => o.rosterId === data.champion)?.id ?? null;
        result = winningOptionId;
        // If no option matches the champion roster, void rather than sink every bet
        if (!winningOptionId) {
          await voidFuture(future, now);
          settled++;
          wagersGraded += future.wagers.length;
          continue;
        }
      }

      const updates: any[] = [
        prisma.betFuture.update({
          where: { id: future.id },
          data: { status: "settled", result, finalValue, settledAt: now },
        }),
      ];
      for (const w of future.wagers) {
        const won = w.optionId === winningOptionId;
        const payout = won ? wagerPayout(w.stake, w.odds) : 0;
        updates.push(
          prisma.betFutureWager.update({
            where: { id: w.id },
            data: { status: won ? "won" : "lost", payout, settledAt: now },
          })
        );
        if (payout > 0) {
          updates.push(
            prisma.wallet.update({
              where: {
                hubLeagueId_profileId: { hubLeagueId: future.hubLeagueId, profileId: w.profileId },
              },
              data: { balance: { increment: payout } },
            })
          );
        }
      }

      await prisma.$transaction(updates);
      settled++;
      wagersGraded += future.wagers.length;
    }

    return NextResponse.json({ season: state.season, week: state.week, settled, wagersGraded });
  } catch (e: any) {
    console.error("[settle-futures GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// Void a future and refund every pending stake (e.g. champion roster with no
// matching option).
async function voidFuture(
  future: { id: string; hubLeagueId: string; wagers: { id: string; stake: number; profileId: number }[] },
  now: Date
) {
  await prisma.$transaction([
    prisma.betFuture.update({
      where: { id: future.id },
      data: { status: "void", settledAt: now },
    }),
    ...future.wagers.flatMap((w) => [
      prisma.betFutureWager.update({
        where: { id: w.id },
        data: { status: "void", payout: w.stake, settledAt: now },
      }),
      prisma.wallet.update({
        where: { hubLeagueId_profileId: { hubLeagueId: future.hubLeagueId, profileId: w.profileId } },
        data: { balance: { increment: w.stake } },
      }),
    ]),
  ]);
}
