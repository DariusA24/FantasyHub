import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/utils/db";
import { discoverEspnLeagues } from "../../_discover";

export const dynamic = "force-dynamic";

// GET — re-sync ESPN leagues using already-saved credentials
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    select: { id: true, espnSwid: true, espnS2: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!profile.espnSwid || !profile.espnS2) {
    return NextResponse.json({ error: "No ESPN credentials saved" }, { status: 400 });
  }

  const discovered = await discoverEspnLeagues(profile.espnSwid, profile.espnS2);

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

  return NextResponse.json({ leaguesDiscovered: savedLeagues.length, leagues: savedLeagues });
}
