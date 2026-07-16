import { NextResponse } from "next/server";

const MOCK_LINES = [
  {
    id: "demo-line-1",
    week: 15,
    matchupId: 1,
    homeName: "Gridiron Gods",
    awayName: "Marcus's Marauders",
    homeProjected: 118.4,
    awayProjected: 104.2,
    homeOdds: 1.38,
    awayOdds: 3.35,
    totalLine: 222.5,
    overOdds: 1.9,
    underOdds: 1.9,
    status: "open",
    homeScore: null,
    awayScore: null,
    wagers: [
      {
        id: "demo-wager-1",
        pick: "home",
        stake: 500,
        odds: 1.38,
        payout: null,
        status: "pending",
        profile: { id: 2, username: "marcusw" },
      },
    ],
  },
  {
    id: "demo-line-2",
    week: 15,
    matchupId: 2,
    homeName: "Tyler's Titans",
    awayName: "The Waiver Warriors",
    homeProjected: 109.8,
    awayProjected: 111.5,
    homeOdds: 2.06,
    awayOdds: 1.87,
    totalLine: 221.5,
    overOdds: 1.9,
    underOdds: 1.9,
    status: "open",
    homeScore: null,
    awayScore: null,
    wagers: [],
  },
];

export async function GET() {
  return NextResponse.json({
    week: 15,
    season: "2025",
    seasonType: "regular",
    locked: false,
    lines: MOCK_LINES,
  });
}
