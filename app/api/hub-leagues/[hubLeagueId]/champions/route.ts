import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    // Champions are public display data (shown on the public league trophy
    // room), so guests can read them; isOwner still gates editing in the UI.
    const user = await getAuthUser();
    let isOwner = false;
    if (user) {
      const [profile, hubLeague] = await Promise.all([
        prisma.profile.findUnique({
          where: { clerkId: user.id },
          select: { id: true },
        }),
        prisma.hubLeague.findUnique({
          where: { id: hubLeagueId },
          select: { ownerId: true },
        }),
      ]);
      isOwner = !!profile && profile.id === hubLeague?.ownerId;
    }

    const champions = await prisma.hubLeagueChampion.findMany({
      where: { hubLeagueId },
      orderBy: { season: "desc" },
    });

    return NextResponse.json({ champions, isOwner });
  } catch (e: any) {
    console.error("[champions GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({ where: { id: hubLeagueId }, select: { ownerId: true } }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.id !== hubLeague?.ownerId) {
      return NextResponse.json({ error: "Only the league owner can add champions" }, { status: 403 });
    }

    const body = await req.json();
    const { season, winnerName, teamName, wins, losses, ties, notes } = body;

    if (!season || !winnerName || wins == null || losses == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const VALID_VARIANTS = ["classic", "diamond", "obsidian", "ruby", "emerald"];
    const safeVariant = VALID_VARIANTS.includes(body.variant) ? body.variant : "classic";

    const champion = await prisma.hubLeagueChampion.upsert({
      where: { hubLeagueId_season: { hubLeagueId, season: String(season) } },
      create: {
        hubLeagueId,
        season: String(season),
        winnerName,
        teamName: teamName || null,
        wins: Number(wins),
        losses: Number(losses),
        ties: Number(ties ?? 0),
        notes: notes || null,
        variant: safeVariant,
      },
      update: {
        winnerName,
        teamName: teamName || null,
        wins: Number(wins),
        losses: Number(losses),
        ties: Number(ties ?? 0),
        notes: notes || null,
        variant: safeVariant,
      },
    });

    return NextResponse.json({ champion });
  } catch (e: any) {
    console.error("[champions POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
