import { NextRequest, NextResponse } from "next/server";

const STATS: Record<string, { season: string; wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number; highWeek: number; lowWeek: number; rank: number | null }[]> = {
  "demo-1": [
    { season: "2025", wins: 10, losses: 2,  ties: 0, pointsFor: 1847.2, pointsAgainst: 1543.1, highWeek: 198.4, lowWeek: 98.2,  rank: 1 },
    { season: "2024", wins: 11, losses: 3,  ties: 0, pointsFor: 1902.1, pointsAgainst: 1601.4, highWeek: 203.1, lowWeek: 102.8, rank: 1 },
    { season: "2023", wins: 9,  losses: 5,  ties: 0, pointsFor: 1784.3, pointsAgainst: 1672.2, highWeek: 187.4, lowWeek: 96.5,  rank: 2 },
    { season: "2022", wins: 7,  losses: 7,  ties: 0, pointsFor: 1651.8, pointsAgainst: 1643.9, highWeek: 172.3, lowWeek: 88.1,  rank: 2 },
  ],
  "demo-2": [
    { season: "2025", wins: 9,  losses: 3,  ties: 0, pointsFor: 1823.4, pointsAgainst: 1654.2, highWeek: 175.6, lowWeek: 101.3, rank: 2 },
    { season: "2024", wins: 10, losses: 4,  ties: 0, pointsFor: 1876.8, pointsAgainst: 1712.4, highWeek: 191.2, lowWeek: 109.7, rank: 1 },
    { season: "2023", wins: 9,  losses: 5,  ties: 0, pointsFor: 1756.2, pointsAgainst: 1643.8, highWeek: 189.6, lowWeek: 98.4,  rank: 1 },
    { season: "2022", wins: 8,  losses: 6,  ties: 0, pointsFor: 1712.5, pointsAgainst: 1689.1, highWeek: 178.4, lowWeek: 94.2,  rank: 3 },
    { season: "2021", wins: 6,  losses: 8,  ties: 0, pointsFor: 1634.7, pointsAgainst: 1701.3, highWeek: 164.9, lowWeek: 87.6,  rank: 6 },
  ],
  "demo-3": [
    { season: "2025", wins: 8,  losses: 4,  ties: 0, pointsFor: 1756.8, pointsAgainst: 1622.3, highWeek: 168.4, lowWeek: 95.2,  rank: 3 },
    { season: "2024", wins: 6,  losses: 8,  ties: 0, pointsFor: 1634.2, pointsAgainst: 1712.8, highWeek: 162.3, lowWeek: 84.7,  rank: 7 },
    { season: "2023", wins: 9,  losses: 5,  ties: 0, pointsFor: 1798.4, pointsAgainst: 1687.2, highWeek: 182.1, lowWeek: 103.4, rank: 2 },
  ],
  "demo-4": [
    { season: "2025", wins: 7,  losses: 5,  ties: 0, pointsFor: 1701.0, pointsAgainst: 1644.8, highWeek: 162.7, lowWeek: 93.4,  rank: 4 },
    { season: "2024", wins: 8,  losses: 6,  ties: 0, pointsFor: 1721.3, pointsAgainst: 1698.7, highWeek: 170.2, lowWeek: 91.8,  rank: 5 },
    { season: "2023", wins: 7,  losses: 7,  ties: 0, pointsFor: 1678.9, pointsAgainst: 1712.4, highWeek: 158.3, lowWeek: 87.1,  rank: 5 },
    { season: "2022", wins: 9,  losses: 5,  ties: 0, pointsFor: 1801.2, pointsAgainst: 1598.4, highWeek: 188.7, lowWeek: 105.6, rank: 3 },
    { season: "2021", wins: 10, losses: 4,  ties: 0, pointsFor: 1834.6, pointsAgainst: 1612.3, highWeek: 194.8, lowWeek: 112.3, rank: 1 },
  ],
};

export async function GET(req: NextRequest) {
  const sleeperUserId = req.nextUrl.searchParams.get("sleeperUserId") ?? "";
  return NextResponse.json({
    stats: STATS[sleeperUserId] ?? [],
    hasSleeperProfile: true,
  });
}
