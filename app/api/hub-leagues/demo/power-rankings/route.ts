import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    rankings: [
      { rank: 1,  displayName: "The Machine",       wins: 10, losses: 2,  ties: 0, pointsFor: 1847.2, isMe: false },
      { rank: 2,  displayName: "Your Team",          wins: 9,  losses: 3,  ties: 0, pointsFor: 1823.4, isMe: true  },
      { rank: 3,  displayName: "Touchdown Factory",  wins: 8,  losses: 4,  ties: 0, pointsFor: 1756.8, isMe: false },
      { rank: 4,  displayName: "Air Raid",           wins: 7,  losses: 5,  ties: 0, pointsFor: 1701.0, isMe: false },
      { rank: 5,  displayName: "Ground & Pound",     wins: 6,  losses: 6,  ties: 0, pointsFor: 1688.5, isMe: false },
      { rank: 6,  displayName: "The Slant Route",    wins: 6,  losses: 6,  ties: 0, pointsFor: 1645.3, isMe: false },
      { rank: 7,  displayName: "Fourth & Long",      wins: 5,  losses: 7,  ties: 0, pointsFor: 1598.1, isMe: false },
      { rank: 8,  displayName: "Touchdown Terror",   wins: 4,  losses: 8,  ties: 0, pointsFor: 1544.9, isMe: false },
      { rank: 9,  displayName: "The Blitz",          wins: 3,  losses: 9,  ties: 0, pointsFor: 1490.2, isMe: false },
      { rank: 10, displayName: "Big Play Kevin",     wins: 2,  losses: 10, ties: 0, pointsFor: 1421.7, isMe: false },
    ],
  });
}
