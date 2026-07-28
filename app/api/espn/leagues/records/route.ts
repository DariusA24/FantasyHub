import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { loadEspnLeague } from "@/app/espn/[leagueId]/espnData";

export const dynamic = "force-dynamic";

// GET /api/espn/leagues/records?season=YYYY
// The user's ESPN leagues that existed in the given season, with their own
// record and a status. Leagues that didn't exist that season are omitted
// (ESPN returns 404 for a season the league wasn't around for).
export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const season = req.nextUrl.searchParams.get("season") ?? String(new Date().getFullYear());
    const currentYear = new Date().getFullYear();

    const synced = await prisma.espnLeague.findMany({
      where: { profileId: profile.id },
      select: { leagueId: true },
    });
    const uniqueIds = [...new Set(synced.map((l) => l.leagueId))];

    const leagues: {
      leagueId: string; name: string; teamCount: number;
      record: string | null; status: string;
    }[] = [];

    await Promise.all(
      uniqueIds.map(async (leagueId) => {
        try {
          const r = await loadEspnLeague(leagueId, season);
          if ("error" in r) return; // didn't exist this season — omit
          const { myTeamId, teams, leagueName, currentPeriod, totalWeeks } = r.data;
          const t = myTeamId != null ? teams.find((x) => x.id === myTeamId) : null;
          const record = t ? `${t.wins}-${t.losses}-${t.ties}` : null;
          const status =
            Number(season) < currentYear || currentPeriod > totalWeeks ? "complete" : "in_season";
          leagues.push({ leagueId, name: leagueName, teamCount: teams.length, record, status });
        } catch { /* skip this league */ }
      })
    );

    return NextResponse.json({ leagues });
  } catch (e: any) {
    console.error("[espn leagues/records GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
