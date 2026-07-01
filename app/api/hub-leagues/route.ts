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
      hubLeagueId,        // optional: link new season to an existing hub league
      previousLeagueId,   // optional: Sleeper's previous_league_id for auto carry-over
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

    // Auto carry-over: if previous season is already linked to a hub league,
    // add this new season to that same hub league automatically.
    if (!hubLeagueId && previousLeagueId) {
      const previousSeason = await prisma.hubLeagueSeason.findFirst({
        where: {
          sleeperLeagueId: previousLeagueId,
          hubLeague: { ownerId: profile.id },
        },
        include: { hubLeague: true },
      });

      if (previousSeason) {
        // Add the new season to the existing hub league
        await prisma.hubLeagueSeason.create({
          data: {
            hubLeagueId: previousSeason.hubLeagueId,
            sleeperLeagueId,
            season,
            sleeperName,
            sleeperSport,
          },
        });

        const updatedHub = await prisma.hubLeague.findUnique({
          where: { id: previousSeason.hubLeagueId },
          include: { seasons: true, members: { include: { profile: true } } },
        });

        return NextResponse.json(
          { hubLeague: updatedHub, carriedOver: true },
          { status: 200 }
        );
      }
    }

    // Link new season to an existing hub league (season carry-over)
    if (hubLeagueId) {
      const existingHub = await prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: { id: true, ownerId: true },
      });

      if (!existingHub) {
        return NextResponse.json({ error: "Hub league not found" }, { status: 404 });
      }

      if (existingHub.ownerId !== profile.id) {
        return NextResponse.json(
          { error: "Forbidden: only the owner can add a season to this hub league" },
          { status: 403 }
        );
      }

      const newSeason = await prisma.hubLeagueSeason.create({
        data: {
          hubLeagueId,
          sleeperLeagueId,
          season,
          sleeperName,
          sleeperSport,
        },
      });

      const updatedHub = await prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        include: { seasons: true, members: { include: { profile: true } } },
      });

      return NextResponse.json(
        { hubLeague: updatedHub, season: newSeason },
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
    const previousLeagueId = searchParams.get("previousLeagueId");

    if (!sleeperLeagueId) {
      return NextResponse.json(
        { error: "Missing sleeperLeagueId" },
        { status: 400 }
      );
    }

    // Build the league ID list to search — include the previous season's ID
    // so hub leagues created for prior seasons are visible when browsing any season.
    const leagueIdFilter = previousLeagueId
      ? { in: [sleeperLeagueId, previousLeagueId] }
      : sleeperLeagueId;

    // Load all seasons for this Sleeper league (or its predecessor) with hub + members
    const hubLeagueSeasons = await prisma.hubLeagueSeason.findMany({
      where: {
        sleeperLeagueId: leagueIdFilter,
      },
      include: {
        hubLeague: {
          include: {
            owner: {
              select: { username: true },
            },
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
      const isOwner = !!profileId && hub.ownerId === profileId;
      return {
        ...season,
        hubLeague: {
          ...hub,
          isMember,
          isOwner,
        },
      };
    });

    // Deduplicate: each hub league may have multiple seasons linked; show it once
    const seen = new Set<string>();
    const deduped = seasonsWithMembership.filter((s) => {
      if (seen.has(s.hubLeague.id)) return false;
      seen.add(s.hubLeague.id);
      return true;
    });

    return NextResponse.json({ hubLeagueSeasons: deduped });
  } catch (e: any) {
    console.error("GET /api/hub-leagues error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load hub leagues" },
      { status: 500 }
    );
  }
}
