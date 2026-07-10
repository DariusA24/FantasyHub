import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    week: 14,
    seasonType: "regular",
    seasonGlance: {
      wins: 9,
      losses: 3,
      ties: 0,
      pointsFor: 1823.4,
      pointsAgainst: 1654.2,
      streak: "W3",
      rank: 2,
    },
    matchup: {
      myTeam:   { displayName: "Your Team",  points: 142.84, projectedPoints: 138.5 },
      opponent: { displayName: "The Machine", points: 138.22, projectedPoints: 141.0 },
    },
  });
}
