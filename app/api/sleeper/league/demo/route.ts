import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    league_id: "demo",
    name: "Gridiron Kings 2025",
    season: "2025",
    sport: "nfl",
    scoring_settings: { rec: 1, pass_td: 4, rush_td: 6, rec_td: 6 },
    settings: { num_teams: 10, type: 0 },
    roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "DEF", "BN", "BN", "BN", "BN", "BN", "BN", "BN"],
  });
}
