import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hubLeagueId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hubLeagueId } = await params;
    if (!hubLeagueId) {
      return NextResponse.json({ error: "Missing hubLeagueId" }, { status: 400 });
    }

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

    // Ensure hub league exists
    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { id: true },
    });

    if (!hubLeague) {
      return NextResponse.json(
        { error: "Hub league not found" },
        { status: 404 }
      );
    }

    // Upsert membership as a regular member
    const membership = await prisma.hubLeagueMember.upsert({
      where: {
        hubLeagueId_profileId: {
          hubLeagueId,
          profileId: profile.id,
        },
      },
      update: {},
      create: {
        hubLeagueId,
        profileId: profile.id,
        role: "member",
      },
    });

    return NextResponse.json({ membership }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/hub-leagues/[id]/join error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to join hub league" },
      { status: 500 }
    );
  }
}
