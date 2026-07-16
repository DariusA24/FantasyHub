import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

// PUT /api/hub-leagues/[hubLeagueId]/punishment — only owner can set/clear
export async function PUT(
  req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const resolvedParams = await context.params;

  const hubLeagueId = resolvedParams.hubLeagueId;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

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
        { error: "Forbidden: only the owner can set the league punishment" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const punishment =
      typeof body.punishment === "string" ? body.punishment.trim() : null;

    if (punishment && punishment.length > 300) {
      return NextResponse.json(
        { error: "Punishment must be 300 characters or fewer" },
        { status: 400 }
      );
    }

    const updated = await prisma.hubLeague.update({
      where: { id: hubLeagueId },
      data: { punishment: punishment || null },
      select: { punishment: true },
    });

    return NextResponse.json({ punishment: updated.punishment });
  } catch (err) {
    console.error("Error updating punishment:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
