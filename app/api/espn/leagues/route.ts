import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// GET — list user's saved ESPN leagues
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const leagues = await prisma.espnLeague.findMany({
    where: { profileId: profile.id },
    orderBy: [{ season: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ leagues });
}

// POST — save a new ESPN league (fetches name/teamCount from ESPN first)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { leagueId, season } = await req.json();
  if (!leagueId || !season) {
    return NextResponse.json({ error: "leagueId and season are required" }, { status: 400 });
  }

  // Fetch from ESPN to validate and cache name/teamCount
  let name: string | null = null;
  let teamCount: number | null = null;
  try {
    const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mSettings`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const data = await res.json();
      name = data?.settings?.name ?? null;
      teamCount = data?.settings?.size ?? null;
    } else if (res.status === 404 || res.status === 401) {
      return NextResponse.json({ error: "League not found or is private" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach ESPN — check the league ID" }, { status: 502 });
  }

  const league = await prisma.espnLeague.upsert({
    where: { profileId_leagueId_season: { profileId: profile.id, leagueId, season } },
    update: { name, teamCount },
    create: { profileId: profile.id, leagueId, season, name, teamCount },
  });

  return NextResponse.json({ league });
}

// DELETE — remove a saved ESPN league
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { leagueId, season } = await req.json();
  await prisma.espnLeague.deleteMany({
    where: { profileId: profile.id, leagueId, season },
  });

  return NextResponse.json({ ok: true });
}
