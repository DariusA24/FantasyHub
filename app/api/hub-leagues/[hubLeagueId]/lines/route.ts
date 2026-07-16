import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { getSleeperMatchups } from "@/utils/sleeperActions";
import { priceMatchup, isWeekLocked } from "@/utils/bettingLines";

const SLEEPER = "https://api.sleeper.app/v1";
const SCORES_CACHE = { next: { revalidate: 300 } } as RequestInit;
const PROJ_CACHE = { next: { revalidate: 3600 } } as RequestInit;

const WAGER_INCLUDE = {
  wagers: {
    include: {
      profile: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

// GET /api/hub-leagues/[hubLeagueId]/lines — this week's house lines
// (generated from Sleeper projections on first request of the week)
export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const resolvedParams = await context.params;

  const hubLeagueId = resolvedParams.hubLeagueId;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: {
        seasons: {
          orderBy: { season: "desc" },
          take: 1,
          select: { sleeperLeagueId: true },
        },
      },
    });

    const sleeperLeagueId = hubLeague?.seasons?.[0]?.sleeperLeagueId;
    if (!sleeperLeagueId) {
      return NextResponse.json({ error: "No Sleeper season linked" }, { status: 400 });
    }

    const stateRes = await fetch(`${SLEEPER}/state/nfl`, SCORES_CACHE);
    if (!stateRes.ok) {
      return NextResponse.json({ error: "Failed to fetch NFL state" }, { status: 502 });
    }
    const state: { week: number; season: string; season_type: string } =
      await stateRes.json();

    const week = state.season_type === "off" ? 1 : Math.max(1, state.week);
    const season = state.season;
    const locked = isWeekLocked(state.season_type);

    let lines = await prisma.betLine.findMany({
      where: { hubLeagueId, season, week },
      include: WAGER_INCLUDE,
      orderBy: { matchupId: "asc" },
    });

    // Generate whenever Sleeper has matchup + projection data for the week —
    // in the offseason that means early week-1 lines as soon as they exist
    if (lines.length === 0) {
      const generated = await generateLines(hubLeagueId, sleeperLeagueId, season, week);
      if (generated > 0) {
        lines = await prisma.betLine.findMany({
          where: { hubLeagueId, season, week },
          include: WAGER_INCLUDE,
          orderBy: { matchupId: "asc" },
        });
      }
    }

    return NextResponse.json({ week, season, seasonType: state.season_type, locked, lines });
  } catch (err) {
    console.error("Error fetching lines:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateLines(
  hubLeagueId: string,
  sleeperLeagueId: string,
  season: string,
  week: number
): Promise<number> {
  const [rostersRes, usersRes, leagueRes, projectionsRes, matchups] =
    await Promise.all([
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/rosters`, SCORES_CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/users`, SCORES_CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}`, PROJ_CACHE),
      fetch(`${SLEEPER}/projections/nfl/regular/${season}/${week}`, PROJ_CACHE),
      getSleeperMatchups(sleeperLeagueId, week),
    ]);

  if (!rostersRes.ok || !usersRes.ok || !projectionsRes.ok || !matchups) return 0;

  const rosters: { roster_id: number; owner_id: string }[] = await rostersRes.json();
  const users: {
    user_id: string;
    display_name: string;
    metadata?: { team_name?: string };
  }[] = await usersRes.json();
  const leagueData: { scoring_settings?: { rec?: number } } = leagueRes.ok
    ? await leagueRes.json()
    : {};
  const projections: Record<string, Record<string, number>> =
    await projectionsRes.json();

  const rec = leagueData.scoring_settings?.rec ?? 1;
  const ptsKey = rec >= 1 ? "pts_ppr" : rec >= 0.5 ? "pts_half_ppr" : "pts_std";

  const sumProjected = (starters: string[]) =>
    Math.round(
      starters.reduce((sum, id) => sum + (projections[id]?.[ptsKey] ?? 0), 0) * 100
    ) / 100;

  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const teamName = (rosterId: number) => {
    const ownerId = rosters.find((r) => r.roster_id === rosterId)?.owner_id;
    const u = ownerId ? userMap.get(ownerId) : undefined;
    return u?.metadata?.team_name || u?.display_name || `Roster ${rosterId}`;
  };

  // Pair matchups by matchup_id (null matchup_id = bye / unmatched)
  const byMatchup = new Map<number, typeof matchups>();
  for (const m of matchups) {
    if (m.matchup_id == null) continue;
    const list = byMatchup.get(m.matchup_id) ?? [];
    list.push(m);
    byMatchup.set(m.matchup_id, list);
  }

  const data = [];
  for (const [matchupId, pair] of byMatchup) {
    if (pair.length !== 2) continue;
    const [home, away] = pair;
    const homeProjected = sumProjected(home.starters ?? []);
    const awayProjected = sumProjected(away.starters ?? []);
    // No projection data yet (e.g. rosters not set) — don't post a junk line
    if (homeProjected === 0 && awayProjected === 0) continue;

    const pricing = priceMatchup(homeProjected, awayProjected);
    data.push({
      hubLeagueId,
      sleeperLeagueId,
      season,
      week,
      matchupId,
      homeRosterId: home.roster_id,
      awayRosterId: away.roster_id,
      homeName: teamName(home.roster_id),
      awayName: teamName(away.roster_id),
      homeProjected,
      awayProjected,
      ...pricing,
    });
  }

  if (data.length === 0) return 0;

  const result = await prisma.betLine.createMany({ data, skipDuplicates: true });
  return result.count;
}
