import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "demo-season-2025",
    hubLeagueId: "demo",
    sleeperLeagueId: "demo",
    season: "2025",
    sleeperName: "Gridiron Kings 2025",
    sleeperSport: "nfl",
    createdAt: "2025-08-01T00:00:00.000Z",
  });
}
