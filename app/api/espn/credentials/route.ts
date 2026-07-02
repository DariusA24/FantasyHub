import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/utils/db";
import { discoverEspnLeagues } from "../_discover";

export const dynamic = "force-dynamic";

// PUT — save ESPN cookies and auto-discover leagues
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { swid, espnS2 } = await req.json();
  if (!swid?.trim() || !espnS2?.trim()) {
    return NextResponse.json({ error: "Both SWID and espn_s2 are required" }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { espnSwid: swid.trim(), espnS2: espnS2.trim() },
  });

  const discovered = await discoverEspnLeagues(swid.trim(), espnS2.trim());

  const savedLeagues = await Promise.all(
    discovered.map((l) =>
      prisma.espnLeague.upsert({
        where: { profileId_leagueId_season: { profileId: profile.id, leagueId: l.leagueId, season: l.season } },
        update: {
          ...(l.name ? { name: l.name } : {}),
          ...(l.teamCount ? { teamCount: l.teamCount } : {}),
        },
        create: {
          profileId: profile.id,
          leagueId: l.leagueId,
          season: l.season,
          name: l.name,
          teamCount: l.teamCount,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true, leaguesDiscovered: savedLeagues.length, leagues: savedLeagues });
}

// DELETE — remove ESPN cookies from the user's profile
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await prisma.profile.update({
    where: { id: profile.id },
    data: { espnSwid: null, espnS2: null },
  });

  return NextResponse.json({ ok: true });
}
