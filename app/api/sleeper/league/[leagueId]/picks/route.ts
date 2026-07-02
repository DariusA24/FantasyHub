import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ leagueId: string }> | { leagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ leagueId: string }>)
    : (ctx.params as { leagueId: string });
}

// GET /api/sleeper/league/[leagueId]/picks
// Returns full pick ownership per roster: { [rosterId]: [{season, round, originalRosterId}] }
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { leagueId } = await resolveParams(ctx);

  try {
    const [leagueRes, rostersRes, tradedPicksRes] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { cache: "no-store" }),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: "no-store" }),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`, { cache: "no-store" }),
    ]);

    const [league, rosters, tradedPicks] = await Promise.all([
      leagueRes.json(),
      rostersRes.json(),
      tradedPicksRes.json(),
    ]);

    if (!Array.isArray(rosters)) {
      return NextResponse.json({}, { status: 502 });
    }

    const totalRounds: number = Math.min(league?.settings?.rounds ?? 3, 5);
    const currentSeason: number = parseInt(league?.season ?? String(new Date().getFullYear()));

    // NFL Draft typically finishes by end of April. If we're in May or later,
    // the current season's picks have already been used — start from next year.
    const now = new Date();
    const draftDone = now.getMonth() >= 4; // month is 0-indexed; 4 = May
    const firstSeason = draftDone ? currentSeason + 1 : currentSeason;
    const seasons = [firstSeason, firstSeason + 1, firstSeason + 2].map(String);
    const rosterIds: number[] = rosters.map((r: any) => r.roster_id);

    // Build index of traded picks: "season_round_originalRosterId" → current owner rosterId
    // Sleeper traded_picks: owner_id is the roster_id of the CURRENT owner
    const tradedIndex: Record<string, number> = {};
    if (Array.isArray(tradedPicks)) {
      for (const tp of tradedPicks) {
        if (!seasons.includes(String(tp.season))) continue;
        const key = `${tp.season}_${tp.round}_${tp.roster_id}`;
        tradedIndex[key] = Number(tp.owner_id);
      }
    }

    // Build ownership: each roster starts owning their own picks, then apply trades
    const ownership: Record<number, Array<{ season: string; round: number; originalRosterId: number }>> = {};
    for (const rosterId of rosterIds) ownership[rosterId] = [];

    for (const season of seasons) {
      for (let round = 1; round <= totalRounds; round++) {
        for (const rosterId of rosterIds) {
          const key = `${season}_${round}_${rosterId}`;
          const currentOwner = tradedIndex[key];

          if (currentOwner !== undefined) {
            // Pick was traded to another team
            if (ownership[currentOwner]) {
              ownership[currentOwner].push({ season, round, originalRosterId: rosterId });
            }
          } else {
            // Still owned by the original team
            ownership[rosterId].push({ season, round, originalRosterId: rosterId });
          }
        }
      }
    }

    return NextResponse.json(ownership);
  } catch (e: any) {
    console.error("[league/picks]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
