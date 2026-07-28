import { NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { loadEspnLeague } from "@/app/espn/[leagueId]/espnData";
import type { MatchupData, PowerRankingTeam } from "@/app/hub-league/[hubLeagueId]/components/types";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };

// GET /api/hub-leagues/[hubLeagueId]/espn-overview
// Overview data for an ESPN-backed (public) hub league, shaped to match what the
// hub-league page expects for Sleeper hubs: managers, commissioner, recent
// trades, this-week matchup, and power rankings — all derived from ESPN.
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const season = await prisma.hubLeagueSeason.findFirst({
      where: { hubLeagueId, espnLeagueId: { not: null } },
      orderBy: { season: "desc" },
      select: { espnLeagueId: true, season: true },
    });

    if (!season?.espnLeagueId) {
      return NextResponse.json({ error: "No ESPN season linked" }, { status: 400 });
    }

    const result = await loadEspnLeague(season.espnLeagueId, season.season);
    if ("error" in result) {
      // Private/not-found ESPN leagues degrade to empty — the hub page still renders.
      return NextResponse.json({
        managers: [],
        commissioner: null,
        recentTrades: [],
        matchup: null,
        powerRankings: [],
        espnError: result.error,
      });
    }

    const { teams, standings, managers, recentTrades, myTeamId, currentPeriod, byWeek } = result.data;

    // Managers shaped like the Sleeper users list the page consumes.
    const managerRows = managers.map((m) => ({
      user_id: m.id,
      display_name: m.displayName,
      avatar: null as string | null,
      is_owner: m.isLeagueManager,
    }));
    const commish = managers.find((m) => m.isLeagueManager) ?? null;

    // Trades shaped like the page's Trade type.
    const trades = recentTrades.map((t) => ({
      transaction_id: t.id,
      when: t.when,
      teams: t.teams,
    }));

    // Power rankings straight from standings order.
    const powerRankings: PowerRankingTeam[] = standings.map((t, i) => ({
      rank: i + 1,
      displayName: t.name,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pf,
      isMe: t.id === myTeamId,
    }));

    // This-week matchup + season glance for the viewer's team (if identified).
    let matchup: MatchupData = { week: currentPeriod, seasonType: "regular", matchup: null };
    if (myTeamId != null) {
      const myTeam = teams.find((t) => t.id === myTeamId);
      const myRank = standings.findIndex((t) => t.id === myTeamId);
      if (myTeam) {
        const weekGames = byWeek.get(currentPeriod) ?? [];
        const game = weekGames.find(
          (g) => g.home.teamId === myTeamId || g.away.teamId === myTeamId
        );
        const oppEntry = game
          ? game.home.teamId === myTeamId ? game.away : game.home
          : null;
        const myEntry = game
          ? game.home.teamId === myTeamId ? game.home : game.away
          : null;
        const oppTeam = oppEntry ? teams.find((t) => t.id === oppEntry.teamId) : null;

        matchup = {
          week: currentPeriod,
          seasonType: "regular",
          seasonGlance: {
            wins: myTeam.wins,
            losses: myTeam.losses,
            ties: myTeam.ties,
            pointsFor: myTeam.pf,
            pointsAgainst: myTeam.pa,
            streak: `${myTeam.streak}${myTeam.streakType}`,
            rank: myRank >= 0 ? myRank + 1 : 0,
          },
          matchup: game
            ? {
                myTeam: { displayName: myTeam.name, points: myEntry?.pts ?? 0, projectedPoints: 0 },
                opponent: oppTeam
                  ? { displayName: oppTeam.name, points: oppEntry?.pts ?? 0, projectedPoints: 0 }
                  : null,
              }
            : null,
        };
      }
    }

    return NextResponse.json({
      managers: managerRows,
      commissioner: commish ? { display_name: commish.displayName, avatar: null } : null,
      recentTrades: trades,
      matchup,
      powerRankings,
    });
  } catch (e: any) {
    console.error("GET espn-overview error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed to load ESPN overview" }, { status: 500 });
  }
}
