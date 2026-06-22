import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

// GET /api/hub-leagues/[hubLeagueId]/awards
// Optional query params: ?season=2024, ?profileId=123
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const [membership, hubLeague] = await Promise.all([
      prisma.hubLeagueMember.findUnique({
        where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
      }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: { ownerId: true },
      }),
    ]);

    const isOwner = profile.id === hubLeague?.ownerId;
    if (!membership && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season") ?? undefined;
    const profileIdParam = searchParams.get("profileId");
    const filterProfileId = profileIdParam ? Number(profileIdParam) : undefined;

    const awards = await prisma.hubLeagueAward.findMany({
      where: {
        hubLeagueId,
        ...(season ? { season } : {}),
        ...(filterProfileId ? { profileId: filterProfileId } : {}),
      },
      orderBy: [{ season: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ awards, isOwner });
  } catch (e: any) {
    console.error("[awards GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
