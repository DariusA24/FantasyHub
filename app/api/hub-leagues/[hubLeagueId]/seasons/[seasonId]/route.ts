import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string; seasonId: string }> };

export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId, seasonId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { ownerId: true, seasons: { select: { id: true } } },
    });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });
    if (hubLeague.ownerId !== profile.id) {
      return NextResponse.json({ error: "Only the owner can remove seasons" }, { status: 403 });
    }
    if (hubLeague.seasons.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last season" }, { status: 400 });
    }

    const season = await prisma.hubLeagueSeason.findFirst({
      where: { id: seasonId, hubLeagueId },
    });
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

    await prisma.hubLeagueSeason.delete({ where: { id: seasonId } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE season]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
