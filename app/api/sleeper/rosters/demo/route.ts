import { NextResponse } from "next/server";

// Realistic Sleeper player IDs for well-known players
const DEMO_ROSTERS = [
  {
    roster_id: 1, owner_id: "demo-2", // "Your Team"
    starters: ["4046", "4866", "6804", "7564", "4953", "3164", "1234", "DEF"],
    players: ["4046", "4866", "6804", "7564", "4953", "3164", "1234", "DEF", "6794", "5892", "7547", "4034", "2374", "6131", "6945"],
    settings: { wins: 9, losses: 3, ties: 0, fpts: 1823, fpts_decimal: 40 },
  },
  {
    roster_id: 2, owner_id: "demo-1", // "The Machine" / Marcus W.
    starters: ["6794", "4034", "5927", "7561", "2133", "5849", "6801", "DEF"],
    players: ["6794", "4034", "5927", "7561", "2133", "5849", "6801", "DEF", "4046", "3321", "6783", "5247", "4199", "7623", "6132"],
    settings: { wins: 10, losses: 2, ties: 0, fpts: 1847, fpts_decimal: 20 },
  },
  {
    roster_id: 3, owner_id: "demo-3", // Tyler R.
    starters: ["3199", "4983", "7543", "6139", "5844", "4049", "6130", "DEF"],
    players: ["3199", "4983", "7543", "6139", "5844", "4049", "6130", "DEF", "5927", "4986", "7002", "6112", "3149", "5603", "4881"],
    settings: { wins: 8, losses: 4, ties: 0, fpts: 1756, fpts_decimal: 80 },
  },
  {
    roster_id: 4, owner_id: "demo-4", // Jordan P.
    starters: ["5844", "6795", "4046", "3056", "6783", "7621", "5247", "DEF"],
    players: ["5844", "6795", "4046", "3056", "6783", "7621", "5247", "DEF", "3164", "6804", "5892", "4199", "7547", "6131", "4866"],
    settings: { wins: 7, losses: 5, ties: 0, fpts: 1701, fpts_decimal: 0 },
  },
  {
    roster_id: 5, owner_id: "demo-5",
    starters: ["4862", "5927", "2133", "7564", "4953", "6945", "3321", "DEF"],
    players: ["4862", "5927", "2133", "7564", "4953", "6945", "3321", "DEF", "7002", "5603", "4881", "6139", "3199", "5849", "6801"],
    settings: { wins: 6, losses: 6, ties: 0, fpts: 1688, fpts_decimal: 50 },
  },
  {
    roster_id: 6, owner_id: "demo-6",
    starters: ["6131", "4866", "7561", "5892", "6794", "5849", "4199", "DEF"],
    players: ["6131", "4866", "7561", "5892", "6794", "5849", "4199", "DEF", "4046", "3164", "6804", "7623", "5247", "6783", "4034"],
    settings: { wins: 6, losses: 6, ties: 0, fpts: 1645, fpts_decimal: 30 },
  },
  {
    roster_id: 7, owner_id: "demo-7",
    starters: ["4034", "6783", "6804", "4953", "2133", "7547", "5603", "DEF"],
    players: ["4034", "6783", "6804", "4953", "2133", "7547", "5603", "DEF", "3199", "4983", "5927", "6130", "7561", "4199", "6132"],
    settings: { wins: 5, losses: 7, ties: 0, fpts: 1598, fpts_decimal: 10 },
  },
  {
    roster_id: 8, owner_id: "demo-8",
    starters: ["5892", "3164", "5927", "6795", "7564", "6794", "4881", "DEF"],
    players: ["5892", "3164", "5927", "6795", "7564", "6794", "4881", "DEF", "4046", "4866", "7621", "3056", "6131", "5247", "3321"],
    settings: { wins: 4, losses: 8, ties: 0, fpts: 1544, fpts_decimal: 90 },
  },
  {
    roster_id: 9, owner_id: "demo-9",
    starters: ["7547", "4983", "5849", "4049", "6130", "3199", "6945", "DEF"],
    players: ["7547", "4983", "5849", "4049", "6130", "3199", "6945", "DEF", "5844", "6783", "7561", "4862", "6801", "2133", "5603"],
    settings: { wins: 3, losses: 9, ties: 0, fpts: 1490, fpts_decimal: 20 },
  },
  {
    roster_id: 10, owner_id: "demo-10",
    starters: ["3056", "6132", "4986", "7621", "3321", "6112", "7002", "DEF"],
    players: ["3056", "6132", "4986", "7621", "3321", "6112", "7002", "DEF", "5892", "3164", "4049", "6130", "6945", "7547", "4881"],
    settings: { wins: 2, losses: 10, ties: 0, fpts: 1421, fpts_decimal: 70 },
  },
];

export async function GET() {
  return NextResponse.json(DEMO_ROSTERS);
}
