import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


/**
 * GET /api/hub-leagues/[hubLeagueId]/h2h
 *
 * Returns all-time head-to-head records for the current user,
 * aggregated across every season, sorted by most games played.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true, sleeperProfileId: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { ownerId: true, members: { select: { profileId: true } } },
    });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });

    const isOwner = profile.id === hubLeague.ownerId;
    const isMember = hubLeague.members.some((m) => m.profileId === profile.id);
    if (!isOwner && !isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sp = new URL(_req.url).searchParams;
    const requestedProfileId = sp.get("profileId");
    const requestedSleeperUserId = sp.get("sleeperUserId");
    let targetSleeperUserId: string | null = profile.sleeperProfileId;

    if (requestedSleeperUserId) {
      targetSleeperUserId = requestedSleeperUserId;
    } else if (requestedProfileId) {
      const targetProfile = await prisma.profile.findUnique({
        where: { id: parseInt(requestedProfileId, 10) },
        select: { sleeperProfileId: true },
      });
      targetSleeperUserId = targetProfile?.sleeperProfileId ?? null;
    }

    if (!targetSleeperUserId) {
      return NextResponse.json({ records: [], hasSleeperProfile: false });
    }

    const currentYear = new Date().getFullYear().toString();

    // Find all distinct seasons that have H2H data for this user in this league
    const allUserSeasons = await prisma.hubLeagueH2H.findMany({
      where: { hubLeagueId, sleeperUserId: targetSleeperUserId },
      select: { season: true },
      distinct: ["season"],
    });
    const seasonValues = allUserSeasons.map((r) => r.season);
    const hasHistoricalData = seasonValues.some((s) => s !== currentYear);

    // Use historical-only filter when we have pre-current-year data.
    // If only current-year data exists (first sync), include everything so
    // the section isn't empty — the frontend will label it accordingly.
    const seasonFilter = hasHistoricalData ? { not: currentYear } : undefined;

    const [rows, latestSeason] = await Promise.all([
      prisma.hubLeagueH2H.findMany({
        where: {
          hubLeagueId,
          sleeperUserId: targetSleeperUserId,
          ...(seasonFilter ? { season: seasonFilter } : {}),
        },
      }),
      prisma.hubLeagueSeason.findFirst({
        where: { hubLeagueId, season: { not: currentYear } },
        orderBy: { season: "desc" },
        select: { season: true },
      }),
    ]);

    // Build set of who played in the most recent completed season
    const activeUserIds = new Set<string>();
    if (latestSeason) {
      const latestStats = await prisma.hubLeagueSeasonStat.findMany({
        where: { hubLeagueId, season: latestSeason.season },
        select: { sleeperUserId: true },
      });
      latestStats.forEach((s) => activeUserIds.add(s.sleeperUserId));
    }

    // Aggregate across seasons by opponent, using the most recent season's name/avatar
    const byOpponent = new Map<string, { displayName: string; opponentAvatar: string | null; latestSeason: string; wins: number; losses: number; ties: number }>();
    for (const row of rows) {
      if (!byOpponent.has(row.opponentUserId)) {
        byOpponent.set(row.opponentUserId, { displayName: row.opponentDisplayName, opponentAvatar: row.opponentAvatar, latestSeason: row.season, wins: 0, losses: 0, ties: 0 });
      }
      const agg = byOpponent.get(row.opponentUserId)!;
      agg.wins += row.wins;
      agg.losses += row.losses;
      agg.ties += row.ties;
      if (row.season > agg.latestSeason) {
        agg.latestSeason = row.season;
        agg.displayName = row.opponentDisplayName;
        if (row.opponentAvatar) agg.opponentAvatar = row.opponentAvatar;
      }
    }

    const records = Array.from(byOpponent.entries())
      .map(([opponentUserId, agg]) => ({
        opponentUserId,
        ...agg,
        played: agg.wins + agg.losses + agg.ties,
        isRetired: activeUserIds.size > 0 && !activeUserIds.has(opponentUserId),
      }))
      .sort((a, b) => b.played - a.played);

    return NextResponse.json({ records, hasSleeperProfile: true, hasHistoricalData });
  } catch (e: any) {
    console.error("[h2h GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
