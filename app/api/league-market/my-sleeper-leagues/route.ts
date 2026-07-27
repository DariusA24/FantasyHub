import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { getUserLeagues } from "@/utils/sleeperService";

export const dynamic = "force-dynamic";

// GET /api/league-market/my-sleeper-leagues — the current user's Sleeper leagues,
// for the "pick a league to list" dropdown.
export async function GET() {
  try {
    const user = await getOptionalAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { sleeperProfileId: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!profile.sleeperProfileId) {
      return NextResponse.json({ linked: false, leagues: [] });
    }

    const year = new Date().getFullYear();
    const seasons = [year, year - 1, year - 2, year - 3, year - 4].map(String);
    const results = await Promise.all(
      seasons.map((s) =>
        getUserLeagues(profile.sleeperProfileId as string, "nfl", s).catch(() => [] as any[])
      )
    );

    // One entry per league_id
    const byId = new Map<string, any>();
    for (const l of results.flat()) {
      if (l?.league_id && !byId.has(l.league_id)) byId.set(l.league_id, l);
    }

    // A renewed league carries previous_league_id → its predecessor is
    // superseded. Keep only the most recent season of each continuing league,
    // but still surface standalone older leagues that never continued.
    const superseded = new Set<string>();
    for (const l of byId.values()) {
      if (l.previous_league_id) superseded.add(l.previous_league_id);
    }

    const out = [...byId.values()]
      .filter((l) => !superseded.has(l.league_id))
      .sort((a, b) => Number(b.season ?? 0) - Number(a.season ?? 0))
      .map((l) => ({
        leagueId: l.league_id,
        name: l.name ?? "Sleeper League",
        season: String(l.season ?? year),
        totalRosters: l.total_rosters ?? null,
      }));

    return NextResponse.json({ linked: true, leagues: out });
  } catch (e: any) {
    console.error("[my-sleeper-leagues GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
