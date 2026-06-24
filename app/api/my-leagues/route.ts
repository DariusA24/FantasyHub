import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// GET /api/my-leagues — returns hub leagues the current user is a member of
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

    return NextResponse.json({ leagues, sleeperUserId: profile.sleeperProfileId ?? null });
  } catch (e: any) {
    console.error("[my-leagues GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
