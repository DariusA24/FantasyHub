import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


// GET  /api/hub-leagues/[hubLeagueId]/manager-profile
// Supports ?profileId=XXX or ?sleeperUserId=XXX to view any member's profile (public read).
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(context);

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { ownerId: true },
    });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });

    const requestedProfileId = req.nextUrl.searchParams.get("profileId");
    const requestedSleeperUserId = req.nextUrl.searchParams.get("sleeperUserId");

    let profile: { id: number; firstName: string; lastName: string; profileImage: string; bio: string | null } | null = null;

    if (requestedSleeperUserId) {
      profile = await prisma.profile.findFirst({
        where: { sleeperProfileId: requestedSleeperUserId },
        select: { id: true, firstName: true, lastName: true, profileImage: true, bio: true },
      });
    } else if (requestedProfileId) {
      profile = await prisma.profile.findUnique({
        where: { id: parseInt(requestedProfileId, 10) },
        select: { id: true, firstName: true, lastName: true, profileImage: true, bio: true },
      });
    } else {
      // No target specified — look up the authenticated user's own profile
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ profile: null, managerProfile: null, favoritePlayer: null });
      profile = await prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { id: true, firstName: true, lastName: true, profileImage: true, bio: true },
      });
    }

    if (!profile) {
      return NextResponse.json({ profile: null, managerProfile: null, favoritePlayer: null });
    }

    const managerProfile = await prisma.hubLeagueManagerProfile.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });

    let favoritePlayer: { id: string; full_name: string | null; position: string | null; team: string | null } | null = null;
    if (managerProfile?.favoritePlayerId) {
      favoritePlayer = await prisma.sleeperPlayer.findUnique({
        where: { id: managerProfile.favoritePlayerId },
        select: { id: true, full_name: true, position: true, team: true },
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        profileImage: profile.profileImage,
        bio: profile.bio,
      },
      managerProfile,
      favoritePlayer,
    });
  } catch (e: any) {
    console.error("GET /manager-profile error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// PATCH /api/hub-leagues/[hubLeagueId]/manager-profile
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(context);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const {
      bio,
      playerStyle,
      playerStyleSub,
      favoriteAsset,
      favoriteAssetSub,
      tradeActivity,
      tradeActivitySub,
      favoritePlayerId,
      favoritePlayerSub,
      mode,
      modeSub,
      rival,
      rivalSub,
    } = body;

    const data = {
      bio: bio ?? null,
      playerStyle: playerStyle ?? null,
      playerStyleSub: playerStyleSub ?? null,
      favoriteAsset: favoriteAsset ?? null,
      favoriteAssetSub: favoriteAssetSub ?? null,
      tradeActivity: tradeActivity ?? null,
      tradeActivitySub: tradeActivitySub ?? null,
      favoritePlayerId: favoritePlayerId ?? null,
      favoritePlayerSub: favoritePlayerSub ?? null,
      mode: mode ?? null,
      modeSub: modeSub ?? null,
      rival: rival ?? null,
      rivalSub: rivalSub ?? null,
    };

    const managerProfile = await prisma.hubLeagueManagerProfile.upsert({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
      update: data,
      create: { hubLeagueId, profileId: profile.id, ...data },
    });

    return NextResponse.json({ managerProfile });
  } catch (e: any) {
    console.error("PATCH /manager-profile error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
