import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/utils/actions";
import { loadEspnLeague } from "@/app/espn/[leagueId]/espnData";

export const dynamic = "force-dynamic";

// GET /api/league-market/espn-teams?leagueId=X&season=Y — teams in an ESPN
// league, for picking which spot is up for grabs.
export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leagueId = req.nextUrl.searchParams.get("leagueId");
    const season = req.nextUrl.searchParams.get("season") ?? "2025";
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });

    const result = await loadEspnLeague(leagueId, season);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error === "private" ? "That ESPN league is private" : "Couldn't load that league" },
        { status: 400 }
      );
    }

    const teams = result.data.teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      wins: t.wins,
      losses: t.losses,
    }));

    return NextResponse.json({ teams });
  } catch (e: any) {
    console.error("[espn-teams GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
