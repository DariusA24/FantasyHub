import { NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId?: string | string[] }> }
) {
  const resolvedParams = await context.params;

  const rawId = resolvedParams.hubLeagueId;
  const hubLeagueId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!hubLeagueId || typeof hubLeagueId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid hubLeagueId param" },
      { status: 400 }
    );
  }

  try {
    console.log("[hub-league-season] fetching by hubLeagueId:", hubLeagueId);

    // If each hub league has only one active season:
    const hubLeagueSeason = await prisma.hubLeagueSeason.findFirst({
      where: { hubLeagueId },
      orderBy: { season: "desc" }, // latest season year first
    });

    if (!hubLeagueSeason) {
      return NextResponse.json(
        { error: "Hub league season not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(hubLeagueSeason, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[hub-league-season] error:", message);
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
