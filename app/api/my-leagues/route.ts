import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { getUserLeagues } from "@/utils/sleeperService";

export const dynamic = "force-dynamic";

// GET /api/my-leagues — returns hub leagues the current user is a member of,
// merged with leagues from their linked Sleeper account
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true, sleeperProfileId: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const memberships = await prisma.hubLeagueMember.findMany({
      where: { profileId: profile.id },
      include: {
        hubLeague: {
          include: {
            seasons: {
              orderBy: { season: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const leagues = memberships.map((m) => ({
      id: m.hubLeague.id,
      name: m.hubLeague.name,
      role: m.role,
      latestSeason: m.hubLeague.seasons[0] ?? null,
    }));

    // Also surface leagues straight from the linked Sleeper account so users
    // who haven't created/joined a hub league still see their leagues in tools
    if (profile.sleeperProfileId) {
      const currentYear = new Date().getFullYear();
      let sleeperLeagues = await getUserLeagues(profile.sleeperProfileId, "nfl", String(currentYear)).catch(() => [] as any[]);
      if (!Array.isArray(sleeperLeagues) || sleeperLeagues.length === 0) {
        sleeperLeagues = await getUserLeagues(profile.sleeperProfileId, "nfl", String(currentYear - 1)).catch(() => [] as any[]);
      }

      const hubSleeperIds = new Set(
        leagues.map((l) => l.latestSeason?.sleeperLeagueId).filter(Boolean)
      );
      for (const l of sleeperLeagues ?? []) {
        if (!l?.league_id || hubSleeperIds.has(l.league_id)) continue;
        // A renewed league gets a new id each season — match on last season's id too
        if (l.previous_league_id && hubSleeperIds.has(l.previous_league_id)) continue;
        leagues.push({
          id: l.league_id,
          name: l.name,
          role: "member",
          latestSeason: { sleeperLeagueId: l.league_id, season: String(l.season) } as any,
        });
      }
    }

    return NextResponse.json({ leagues, sleeperUserId: profile.sleeperProfileId ?? null });
  } catch (e: any) {
    console.error("[my-leagues GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
