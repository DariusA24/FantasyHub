import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


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

    // Allow owner through even if they don't have a membership record
    if (!membership && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
