import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { computeAwardsForSeason } from "@/utils/computeLeagueAwards";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

// POST /api/hub-leagues/[hubLeagueId]/awards/compute
// Body: { season: string }
// Owner-only. Computes (or recomputes) awards for a single season.
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({ where: { id: hubLeagueId }, select: { ownerId: true } }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });
    if (profile.id !== hubLeague.ownerId) {
      return NextResponse.json({ error: "Only the league owner can compute awards" }, { status: 403 });
    }

    const body = await req.json();
    const { season } = body;
    if (!season) return NextResponse.json({ error: "season is required" }, { status: 400 });

    const hubSeason = await prisma.hubLeagueSeason.findFirst({
      where: { hubLeagueId, season: String(season) },
    });
    if (!hubSeason) {
      return NextResponse.json({ error: `No season found for ${season}` }, { status: 404 });
    }

    const count = await computeAwardsForSeason(hubLeagueId, hubSeason.sleeperLeagueId, String(season));

    return NextResponse.json({ count });
  } catch (e: any) {
    console.error("[awards compute POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
