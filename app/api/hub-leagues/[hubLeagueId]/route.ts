import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteParams = {
  params: { hubLeagueId: string };
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string }> } | { params: { hubLeagueId: string } }
) {
  // Support both sync and async params typings
  const resolvedParams =
    "then" in (context.params as any)
      ? await (context.params as Promise<{ hubLeagueId: string }>)
      : (context.params as { hubLeagueId: string });

  const hubLeagueId = resolvedParams.hubLeagueId;

  if (!hubLeagueId) {
    return NextResponse.json(
      { error: "Missing hubLeagueId param" },
      { status: 400 }
    );
  }

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile for current user
    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for user" },
        { status: 404 }
      );
    }

    // Load hub league with owner + members + seasons
    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        seasons: {
          orderBy: { season: "desc" },
        },
        members: {
          include: {
            profile: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!hubLeague) {
      return NextResponse.json(
        { error: "Hub league not found" },
        { status: 404 }
      );
    }

    const isOwner = hubLeague.ownerId === profile.id;

    // Membership check via HubLeagueMember
    const isMember = hubLeague.members.some(
      (m) => m.profileId === profile.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Forbidden: not invited to this hub league" },
        { status: 403 }
      );
    }

    return NextResponse.json({ hubLeague, isOwner }, { status: 200 });
  } catch (err) {
    console.error("Error fetching hub league:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// NEW: DELETE /api/hub-leagues/[hubLeagueId] — only owner can delete
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hubLeagueId = params.hubLeagueId;

    // Get profile for current user
    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found for user" },
        { status: 404 }
      );
    }

    // Find hub league to verify ownership
    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { id: true, ownerId: true },
    });

    if (!hubLeague) {
      return NextResponse.json(
        { error: "Hub league not found" },
        { status: 404 }
      );
    }

    if (hubLeague.ownerId !== profile.id) {
      return NextResponse.json(
        { error: "Forbidden: only the owner can delete this hub league" },
        { status: 403 }
      );
    }

    // Delete hub league; related records will be deleted according to your
    // Prisma referential actions (onDelete). If needed, you can manually
    // delete seasons/members first.
    await prisma.hubLeague.delete({
      where: { id: hubLeagueId },
    });

    return NextResponse.json(
      { success: true, message: "Hub league deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting hub league:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
