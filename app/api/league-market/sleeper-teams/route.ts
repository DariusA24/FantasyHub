import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/utils/actions";
import { getLeagueRosters, getLeagueUsers } from "@/utils/sleeperService";

export const dynamic = "force-dynamic";

// GET /api/league-market/sleeper-teams?leagueId=X — teams in a Sleeper league,
// for picking which spot is up for grabs. Unowned teams are flagged as open.
export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leagueId = req.nextUrl.searchParams.get("leagueId");
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });

    const [rosters, users] = await Promise.all([
      getLeagueRosters(leagueId).catch(() => [] as any[]),
      getLeagueUsers(leagueId).catch(() => [] as any[]),
    ]);
    if (!Array.isArray(rosters) || rosters.length === 0) {
      return NextResponse.json({ error: "Couldn't load that league's teams" }, { status: 400 });
    }

    const userMap = new Map((users ?? []).map((u: any) => [u.user_id, u]));
    const teams = rosters.map((r: any) => {
      const owner = r.owner_id ? userMap.get(r.owner_id) : null;
      const teamName = owner?.metadata?.team_name || owner?.display_name || `Team ${r.roster_id}`;
      return {
        rosterId: r.roster_id,
        teamName,
        ownerName: owner?.display_name ?? null,
        wins: r.settings?.wins ?? 0,
        losses: r.settings?.losses ?? 0,
        isOpen: !r.owner_id,
      };
    });

    return NextResponse.json({ teams });
  } catch (e: any) {
    console.error("[sleeper-teams GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
