import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

async function getProfileAndCookie(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    select: { id: true, espnSwid: true, espnS2: true },
  });
  const cookieHeader =
    profile?.espnSwid && profile?.espnS2
      ? `SWID=${profile.espnSwid}; espn_s2=${profile.espnS2}`
      : undefined;
  return { profile, cookieHeader };
}

// GET — list user's saved ESPN leagues
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = await getProfileAndCookie(userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const leagues = await prisma.espnLeague.findMany({
    where: { profileId: profile.id },
    orderBy: [{ season: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ leagues });
}

// POST — save a new ESPN league (fetches name/teamCount from ESPN using saved credentials)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, cookieHeader } = await getProfileAndCookie(userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { leagueId, season, name: providedName } = await req.json();
  if (!leagueId || !season) {
    return NextResponse.json({ error: "leagueId and season are required" }, { status: 400 });
  }

  // Save immediately — ESPN blocks server-side validation requests.
  // The league detail page fetches the real name/data when the user opens it.
  const name: string | null = providedName ?? null;
  const teamCount: number | null = null;

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

  const { profile } = await getProfileAndCookie(userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { leagueId, season } = await req.json();
  await prisma.espnLeague.deleteMany({
    where: { profileId: profile.id, leagueId, season },
  });

  return NextResponse.json({ ok: true });
}
