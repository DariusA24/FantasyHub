import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/utils/actions';
import { prisma } from '@/utils/db';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sleeperLeagueId,
      sleeperName,
      sleeperSport,
      season,
      name,
      description,
    } = body ?? {};

    if (!sleeperLeagueId || !season || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find profile for current user
    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: {
        id: true,
        clerkId: true,
        sleeperProfileId: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for user" },
        { status: 404 }
      );
    }

    // NEW: check if user already has a hub league season for this Sleeper league
    const existingSeason = await prisma.hubLeagueSeason.findFirst({
      where: {
        sleeperLeagueId,
        hubLeague: {
          ownerId: profile.id,
        },
      },
      include: {
        hubLeague: true,
      },
    });

    if (existingSeason) {
      // Return the existing hubLeague instead of creating a duplicate
      return NextResponse.json(
        { hubLeague: existingSeason.hubLeague, alreadyExists: true },
        { status: 200 }
      );
    }

    // Create new hub league + season
    const hubLeague = await prisma.hubLeague.create({
      data: {
        name,
        description,
        ownerId: profile.id,
        seasons: {
          create: {
            sleeperLeagueId,
            season,
            sleeperName,
            sleeperSport,
          },
        },
      },
      include: {
        seasons: true,
        // include members so we can see the membership after creation
        members: true,
      },
    });

    // Create membership for the owner if it doesn't exist yet
    await prisma.hubLeagueMember.upsert({
      where: {
        hubLeagueId_profileId: {
          hubLeagueId: hubLeague.id,
          profileId: profile.id,
        },
      },
      update: {}, // nothing to update if it exists
      create: {
        hubLeagueId: hubLeague.id,
        profileId: profile.id,
        role: "owner", // or "member" if you prefer
      },
    });

    // Optionally re-fetch hubLeague with members including profile info
    const hubLeagueWithMembers = await prisma.hubLeague.findUnique({
      where: { id: hubLeague.id },
      include: {
        seasons: true,
        members: {
          include: {
            profile: true,
          },
        },
      },
    });

    return NextResponse.json(
      { hubLeague: hubLeagueWithMembers ?? hubLeague },
      { status: 201 }
    );
  } catch (err: any) {
    // log as much as possible
    console.error("Error creating hub league (raw):", err);
    if (err?.code) console.error("Prisma error code:", err.code);
    if (err?.meta) console.error("Prisma error meta:", err.meta);
    if (err?.stack) console.error("Stack:", err.stack);

    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err?.message || JSON.stringify(err);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// NEW: GET /api/hub-leagues?sleeperLeagueId=...
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(); // can be null (guest)
    const { searchParams } = new URL(req.url);
    const sleeperLeagueId = searchParams.get("sleeperLeagueId");

    if (!sleeperLeagueId) {
      return NextResponse.json(
        { error: "Missing sleeperLeagueId" },
        { status: 400 }
      );
    }

    // Load all seasons for this Sleeper league with hub + members
    const hubLeagueSeasons = await prisma.hubLeagueSeason.findMany({
      where: {
        sleeperLeagueId,
      },
      include: {
        hubLeague: {
          include: {
            members: {
              select: {
                profileId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Compute membership flags if user is logged in
    let profileId: number | null = null;
    if (user) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });
      profileId = profile?.id ?? null;
    }

    const seasonsWithMembership = hubLeagueSeasons.map((season) => {
      const hub = season.hubLeague;
      const isMember =
        !!profileId &&
        hub.members.some((m) => m.profileId === profileId);
      return {
        ...season,
        hubLeague: {
          ...hub,
          isMember,
        },
      };
    });

    return NextResponse.json({ hubLeagueSeasons: seasonsWithMembership });
  } catch (e: any) {
    console.error("GET /api/hub-leagues error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load hub leagues" },
      { status: 500 }
    );
  }
}
