import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { getSleeperMatchups } from "@/utils/sleeperActions";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

const SLEEPER = "https://api.sleeper.app/v1";
const SCORES_CACHE  = { next: { revalidate: 300  } } as RequestInit; // 5 min — live scores
const PROJ_CACHE    = { next: { revalidate: 3600 } } as RequestInit; // 1 hr  — projections

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { sleeperProfileId: true },
      }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: {
          seasons: {
            orderBy: { season: "desc" },
            take: 1,
            select: { sleeperLeagueId: true },
          },
        },
      }),
    ]);

    if (!profile?.sleeperProfileId) {
      return NextResponse.json({ error: "No Sleeper account linked" }, { status: 400 });
    }

    const sleeperLeagueId = hubLeague?.seasons?.[0]?.sleeperLeagueId;
    if (!sleeperLeagueId) {
      return NextResponse.json({ error: "No Sleeper season linked" }, { status: 400 });
    }

    // Round 1: state + rosters + users + league settings (all independent)
    const [stateRes, rostersRes, usersRes, leagueRes] = await Promise.all([
      fetch(`${SLEEPER}/state/nfl`, SCORES_CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/rosters`, SCORES_CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/users`, SCORES_CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}`, PROJ_CACHE),
    ]);

    if (!stateRes.ok || !rostersRes.ok || !usersRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Sleeper data" }, { status: 502 });
    }

    const state: { week: number; season: string; season_type: string } = await stateRes.json();
    type SleeperRoster = {
      roster_id: number;
      owner_id: string;
      settings?: {
        wins?: number;
        losses?: number;
        ties?: number;
        fpts?: number;
        fpts_decimal?: number;
        fpts_against?: number;
        fpts_against_decimal?: number;
        streak?: number;
      };
    };
    const rosters: SleeperRoster[] = await rostersRes.json();
    const users: { user_id: string; display_name: string }[] = await usersRes.json();
    const leagueData: { scoring_settings?: { rec?: number } } = leagueRes.ok ? await leagueRes.json() : {};

    // Determine which pre-calculated pts column to use
    const rec = leagueData.scoring_settings?.rec ?? 1;
    const ptsKey = rec >= 1 ? "pts_ppr" : rec >= 0.5 ? "pts_half_ppr" : "pts_std";

    const currentWeek = Math.max(1, state.week);

    // Offseason fallback: week 1 if current week is unavailable
    const week = state.season_type === "off" ? 1 : currentWeek;

    // Round 2: matchups + projections in parallel
    const [matchups, projectionsRes] = await Promise.all([
      getSleeperMatchups(sleeperLeagueId, week),
      fetch(`${SLEEPER}/projections/nfl/regular/${state.season}/${week}`, PROJ_CACHE),
    ]);

    if (!matchups) {
      return NextResponse.json({ error: "Failed to fetch matchups" }, { status: 502 });
    }

    // projections: { player_id: { pts_ppr: N, pts_half_ppr: N, pts_std: N, ... } }
    const projections: Record<string, Record<string, number>> =
      projectionsRes.ok ? await projectionsRes.json() : {};

    const sumProjected = (starters: string[]) =>
      starters.reduce((sum, id) => sum + (projections[id]?.[ptsKey] ?? 0), 0);

    // Find user's roster and matchup
    const myRoster = rosters.find((r) => r.owner_id === profile.sleeperProfileId);
    if (!myRoster) {
      return NextResponse.json({ error: "You are not in this league" }, { status: 404 });
    }

    // Season at a Glance stats
    const s = myRoster.settings ?? {};
    const wins = s.wins ?? 0;
    const losses = s.losses ?? 0;
    const ties = s.ties ?? 0;
    const pointsFor = (s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100;
    const pointsAgainst = (s.fpts_against ?? 0) + (s.fpts_against_decimal ?? 0) / 100;
    const streakRaw = s.streak ?? 0;
    const streak = streakRaw === 0 ? "—" : streakRaw > 0 ? `W${streakRaw}` : `L${Math.abs(streakRaw)}`;

    // Rank: sort by wins DESC, then fpts DESC as tiebreaker
    const sortedRosters = [...rosters].sort((a, b) => {
      const aWins = a.settings?.wins ?? 0;
      const bWins = b.settings?.wins ?? 0;
      if (bWins !== aWins) return bWins - aWins;
      const aFpts = (a.settings?.fpts ?? 0) + (a.settings?.fpts_decimal ?? 0) / 100;
      const bFpts = (b.settings?.fpts ?? 0) + (b.settings?.fpts_decimal ?? 0) / 100;
      return bFpts - aFpts;
    });
    const rank = sortedRosters.findIndex((r) => r.roster_id === myRoster.roster_id) + 1;

    const seasonGlance = { wins, losses, ties, pointsFor, pointsAgainst, streak, rank };

    const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
    if (!myMatchup) {
      return NextResponse.json({ matchup: null, week, seasonGlance });
    }

    const oppMatchup = matchups.find(
      (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myMatchup.roster_id
    );

    const userMap = new Map(users.map((u) => [u.user_id, u.display_name]));
    const rosterOwnerMap = new Map(rosters.map((r) => [r.roster_id, r.owner_id]));

    const getDisplayName = (rosterId: number) => {
      const ownerId = rosterOwnerMap.get(rosterId);
      return ownerId ? (userMap.get(ownerId) ?? "Unknown") : "Unknown";
    };

    return NextResponse.json({
      week,
      seasonType: state.season_type,
      seasonGlance,
      matchup: {
        myTeam: {
          displayName: getDisplayName(myMatchup.roster_id),
          points: myMatchup.points ?? 0,
          projectedPoints: Math.round(sumProjected(myMatchup.starters ?? []) * 100) / 100,
        },
        opponent: oppMatchup
          ? {
              displayName: getDisplayName(oppMatchup.roster_id),
              points: oppMatchup.points ?? 0,
              projectedPoints: Math.round(sumProjected(oppMatchup.starters ?? []) * 100) / 100,
            }
          : null,
      },
    });
  } catch (e: any) {
    console.error("[matchup] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
