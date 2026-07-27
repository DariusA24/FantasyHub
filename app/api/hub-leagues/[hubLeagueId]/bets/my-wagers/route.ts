import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };

// GET /api/hub-leagues/[hubLeagueId]/bets/my-wagers
// The current user's house (Book) wagers with matchup context, so the unified
// Active view can show them alongside peer-to-peer bets without loading the
// whole week's book.
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const wagers = await prisma.betWager.findMany({
      where: { profileId: profile.id, line: { hubLeagueId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        pick: true,
        stake: true,
        odds: true,
        status: true,
        payout: true,
        settledAt: true,
        line: {
          select: {
            id: true,
            week: true,
            season: true,
            homeName: true,
            awayName: true,
            totalLine: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ wagers });
  } catch (e: any) {
    console.error("[bets/my-wagers GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
