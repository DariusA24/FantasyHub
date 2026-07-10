import { NextRequest, NextResponse } from "next/server";

const OPPONENTS = [
  { opponentUserId: "demo-1",  displayName: "Marcus W.",      opponentAvatar: null },
  { opponentUserId: "demo-3",  displayName: "Tyler R.",       opponentAvatar: null },
  { opponentUserId: "demo-4",  displayName: "Jordan P.",      opponentAvatar: null },
  { opponentUserId: "demo-5",  displayName: "Alex C.",        opponentAvatar: null },
  { opponentUserId: "demo-6",  displayName: "Ryan M.",        opponentAvatar: null },
  { opponentUserId: "demo-7",  displayName: "Chris B.",       opponentAvatar: null },
  { opponentUserId: "demo-8",  displayName: "Sam T.",         opponentAvatar: null },
  { opponentUserId: "demo-9",  displayName: "Mike F.",        opponentAvatar: null },
  { opponentUserId: "demo-10", displayName: "Big Play Kevin", opponentAvatar: null },
];

// Default H2H records for "Your Team" (demo-2). Adjust per viewer if needed.
const H2H_BY_VIEWER: Record<string, { opponentUserId: string; wins: number; losses: number; ties: number }[]> = {
  "demo-2": [
    { opponentUserId: "demo-1",  wins: 3, losses: 7, ties: 0 },
    { opponentUserId: "demo-3",  wins: 6, losses: 4, ties: 0 },
    { opponentUserId: "demo-4",  wins: 5, losses: 5, ties: 0 },
    { opponentUserId: "demo-5",  wins: 7, losses: 3, ties: 0 },
    { opponentUserId: "demo-6",  wins: 8, losses: 2, ties: 0 },
    { opponentUserId: "demo-7",  wins: 9, losses: 1, ties: 0 },
    { opponentUserId: "demo-8",  wins: 7, losses: 3, ties: 0 },
    { opponentUserId: "demo-9",  wins: 8, losses: 2, ties: 0 },
    { opponentUserId: "demo-10", wins: 9, losses: 1, ties: 0 },
  ],
  "demo-1": [
    { opponentUserId: "demo-2",  wins: 7, losses: 3, ties: 0 },
    { opponentUserId: "demo-3",  wins: 7, losses: 3, ties: 0 },
    { opponentUserId: "demo-4",  wins: 6, losses: 4, ties: 0 },
    { opponentUserId: "demo-5",  wins: 8, losses: 2, ties: 0 },
    { opponentUserId: "demo-6",  wins: 9, losses: 1, ties: 0 },
    { opponentUserId: "demo-7",  wins: 8, losses: 2, ties: 0 },
    { opponentUserId: "demo-8",  wins: 9, losses: 1, ties: 0 },
    { opponentUserId: "demo-9",  wins: 10, losses: 0, ties: 0 },
    { opponentUserId: "demo-10", wins: 9, losses: 1, ties: 0 },
  ],
};

const ALL_DEMO_USERS: Record<string, string> = {
  "demo-1": "Marcus W.", "demo-2": "Your Team", "demo-3": "Tyler R.",
  "demo-4": "Jordan P.", "demo-5": "Alex C.",   "demo-6": "Ryan M.",
  "demo-7": "Chris B.",  "demo-8": "Sam T.",    "demo-9": "Mike F.",
  "demo-10": "Big Play Kevin",
};

export async function GET(req: NextRequest) {
  const sleeperUserId = req.nextUrl.searchParams.get("sleeperUserId") ?? "demo-2";
  const records = H2H_BY_VIEWER[sleeperUserId];

  if (records) {
    return NextResponse.json({
      records: records.map((r) => ({
        ...r,
        played: r.wins + r.losses + r.ties,
        displayName: ALL_DEMO_USERS[r.opponentUserId] ?? "Unknown",
        opponentAvatar: null,
        isRetired: false,
      })),
      historical: true,
    });
  }

  // Generate default H2H for any other demo user
  const opponents = Object.entries(ALL_DEMO_USERS)
    .filter(([id]) => id !== sleeperUserId)
    .map(([opponentUserId, displayName]) => {
      const wins = Math.floor(Math.random() * 8);
      const losses = Math.floor(Math.random() * 6);
      return { opponentUserId, displayName, opponentAvatar: null, wins, losses, ties: 0, played: wins + losses, isRetired: false };
    });

  return NextResponse.json({ records: opponents, historical: true });
}
