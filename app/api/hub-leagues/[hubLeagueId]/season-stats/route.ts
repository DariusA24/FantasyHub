import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

/**
 * GET /api/hub-leagues/[hubLeagueId]/season-stats
 *
 * Returns the current user's season-by-season stats for this hub league,
 * sorted newest → oldest. Requires a linked Sleeper profile.
 *
 * Optionally pass ?sleeperUserId=XXX to fetch another manager's stats
 * (any league member can read any manager's stats).
 */
export async function GET(req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true, sleeperProfileId: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: {
        ownerId: true,
        members: { select: { profileId: true } },
      },
    });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });

    const isOwner = profile.id === hubLeague.ownerId;
    const isMember = hubLeague.members.some((m) => m.profileId === profile.id);
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const requestedSleeperUserId = url.searchParams.get("sleeperUserId");
    const requestedProfileId = url.searchParams.get("profileId");

    let targetSleeperUserId = requestedSleeperUserId ?? profile.sleeperProfileId;

    if (!targetSleeperUserId && requestedProfileId) {
      const targetProfile = await prisma.profile.findUnique({
        where: { id: parseInt(requestedProfileId, 10) },
        select: { sleeperProfileId: true },
      });
      targetSleeperUserId = targetProfile?.sleeperProfileId ?? null;
    }

    if (!targetSleeperUserId) {
      return NextResponse.json({ stats: [], hasSleeperProfile: false });
    }

    const stats = await prisma.hubLeagueSeasonStat.findMany({
      where: { hubLeagueId, sleeperUserId: targetSleeperUserId },
      orderBy: { season: "desc" },
      select: {
        season: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        highWeek: true,
        lowWeek: true,
        rank: true,
      },
    });

    return NextResponse.json({ stats, hasSleeperProfile: true });
  } catch (e: any) {
    console.error("[season-stats GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
