import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


// GET /api/hub-leagues/[hubLeagueId]/awards
// Optional query params: ?season=2024, ?profileId=123, ?sleeperUserId=XXX
// Public read — no auth required.
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season") ?? undefined;
    const profileIdParam = searchParams.get("profileId");
    const sleeperUserIdParam = searchParams.get("sleeperUserId");
    const filterProfileId = profileIdParam ? Number(profileIdParam) : undefined;

    const awards = await prisma.hubLeagueAward.findMany({
      where: {
        hubLeagueId,
        ...(season ? { season } : {}),
        ...(sleeperUserIdParam ? { sleeperUserId: sleeperUserIdParam } : filterProfileId ? { profileId: filterProfileId } : {}),
      },
      orderBy: [{ season: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ awards });
  } catch (e: any) {
    console.error("[awards GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
