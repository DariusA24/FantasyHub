import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { priceChampion, priceWinTotal, type TeamStanding } from "@/utils/bettingFutures";

const SLEEPER = "https://api.sleeper.app/v1";
const CACHE = { next: { revalidate: 300 } } as RequestInit;

const FUTURE_INCLUDE = {
  options: { orderBy: { odds: "asc" as const } },
};

// GET /api/hub-leagues/[hubLeagueId]/futures — season-long house markets
// (league champion + per-team win totals), generated on first request.
export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const { hubLeagueId } = await context.params;

  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: {
        seasons: { orderBy: { season: "desc" }, take: 1, select: { sleeperLeagueId: true } },
      },
    });
    const sleeperLeagueId = hubLeague?.seasons?.[0]?.sleeperLeagueId;
    if (!sleeperLeagueId) {
      return NextResponse.json({ error: "No Sleeper season linked" }, { status: 400 });
    }

    const stateRes = await fetch(`${SLEEPER}/state/nfl`, CACHE);
    if (!stateRes.ok) return NextResponse.json({ error: "Failed to fetch NFL state" }, { status: 502 });
    const state: { week: number; season: string; season_type: string } = await stateRes.json();
    const season = state.season;

    let futures = await prisma.betFuture.findMany({
      where: { hubLeagueId, season },
      include: FUTURE_INCLUDE,
      orderBy: [{ kind: "asc" }, { subjectName: "asc" }],
    });

    if (futures.length === 0) {
      const created = await generateFutures(hubLeagueId, sleeperLeagueId, season);
      if (created > 0) {
        futures = await prisma.betFuture.findMany({
          where: { hubLeagueId, season },
          include: FUTURE_INCLUDE,
          orderBy: [{ kind: "asc" }, { subjectName: "asc" }],
        });
      }
    }

    const closesWeek = futures[0]?.closesWeek ?? 15;
    const locked =
      state.season_type === "post" ||
      (state.season_type === "regular" && Number(state.week) >= closesWeek);

    const myWagers = await prisma.betFutureWager.findMany({
      where: { profileId: profile.id, future: { hubLeagueId, season } },
      select: { id: true, futureId: true, optionId: true, stake: true, odds: true, status: true, payout: true },
    });

    return NextResponse.json({
      season,
      seasonType: state.season_type,
      week: state.week,
      locked,
      futures,
      myWagers,
    });
  } catch (err) {
    console.error("[futures GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateFutures(
  hubLeagueId: string,
  sleeperLeagueId: string,
  season: string
): Promise<number> {
  const [rostersRes, usersRes, leagueRes] = await Promise.all([
    fetch(`${SLEEPER}/league/${sleeperLeagueId}/rosters`, CACHE),
    fetch(`${SLEEPER}/league/${sleeperLeagueId}/users`, CACHE),
    fetch(`${SLEEPER}/league/${sleeperLeagueId}`, CACHE),
  ]);
  if (!rostersRes.ok || !usersRes.ok) return 0;

  const rosters: {
    roster_id: number;
    owner_id: string;
    settings?: { wins?: number; losses?: number; fpts?: number; fpts_decimal?: number };
  }[] = await rostersRes.json();
  const users: { user_id: string; display_name: string; metadata?: { team_name?: string } }[] =
    await usersRes.json();
  const league: { settings?: { playoff_week_start?: number } } = leagueRes.ok
    ? await leagueRes.json()
    : {};

  if (rosters.length < 2) return 0;

  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const teamName = (r: (typeof rosters)[number]) => {
    const u = userMap.get(r.owner_id);
    return u?.metadata?.team_name || u?.display_name || `Roster ${r.roster_id}`;
  };

  const teams: TeamStanding[] = rosters.map((r) => ({
    rosterId: r.roster_id,
    name: teamName(r),
    wins: r.settings?.wins ?? 0,
    losses: r.settings?.losses ?? 0,
    pointsFor: (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
  }));

  const playoffWeekStart = league.settings?.playoff_week_start ?? 15;
  const closesWeek = playoffWeekStart;
  const regularSeasonGames = Math.max(1, playoffWeekStart - 1);

  const championOdds = priceChampion(teams);

  await prisma.$transaction([
    // League champion outright — one option per team
    prisma.betFuture.create({
      data: {
        hubLeagueId,
        sleeperLeagueId,
        season,
        kind: "champion",
        title: "League Champion",
        closesWeek,
        options: {
          create: championOdds.map((o) => ({
            label: o.name,
            rosterId: o.rosterId,
            odds: o.odds,
          })),
        },
      },
    }),
    // Per-team regular-season win totals — over/under
    ...teams.map((t) => {
      const { line, overOdds, underOdds } = priceWinTotal(t, regularSeasonGames);
      return prisma.betFuture.create({
        data: {
          hubLeagueId,
          sleeperLeagueId,
          season,
          kind: "win_total",
          title: `${t.name} Win Total`,
          subjectRosterId: t.rosterId,
          subjectName: t.name,
          line,
          closesWeek,
          options: {
            create: [
              { label: `Over ${line}`, pick: "over", odds: overOdds },
              { label: `Under ${line}`, pick: "under", odds: underOdds },
            ],
          },
        },
      });
    }),
  ]);

  return teams.length + 1;
}
