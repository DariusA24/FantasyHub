import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isOwner: false,
    champions: [
      { id: "demo-champ-1", season: "2025", winnerName: "Marcus W.",  teamName: "The Machine",       wins: 11, losses: 3, ties: 0, notes: "3-peat incoming? Undefeated in playoffs",         variant: "classic"  },
      { id: "demo-champ-2", season: "2024", winnerName: "You",         teamName: "Your Team",         wins: 10, losses: 4, ties: 0, notes: "Controversial championship run — ask Tyler",       variant: "diamond"  },
      { id: "demo-champ-3", season: "2023", winnerName: "Tyler R.",    teamName: "Touchdown Factory", wins: 9,  losses: 5, ties: 0, notes: "First championship after 4 years of trying",      variant: "ruby"     },
      { id: "demo-champ-4", season: "2022", winnerName: "Kevin L.",    teamName: "Big Play Kevin",    wins: 12, losses: 2, ties: 0, notes: "Most dominant regular season in league history",   variant: "emerald"  },
      { id: "demo-champ-5", season: "2021", winnerName: "Jordan P.",   teamName: "Air Raid",          wins: 10, losses: 4, ties: 0, notes: "Founding season champion",                         variant: "obsidian" },
    ],
  });
}
