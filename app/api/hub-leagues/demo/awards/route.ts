import { NextRequest, NextResponse } from "next/server";

const AWARDS: Record<string, { id: string; season: string; type: string; label: string; description: string; value?: string; week?: number; sleeperUserId: string }[]> = {
  "demo-1": [
    { id: "a1", season: "2025", type: "champion",            label: "Champion",              description: "Won the championship",                       sleeperUserId: "demo-1" },
    { id: "a2", season: "2024", type: "champion",            label: "Champion",              description: "Won the championship",                       sleeperUserId: "demo-1" },
    { id: "a3", season: "2023", type: "best_regular_season", label: "Best Regular Season",   description: "Best regular season record",                 sleeperUserId: "demo-1" },
    { id: "a4", season: "2022", type: "runner_up",           label: "Runner-Up",             description: "Finished 2nd in the championship",           sleeperUserId: "demo-1" },
  ],
  "demo-2": [
    { id: "b1", season: "2024", type: "champion",            label: "Champion",              description: "Won the championship",                       sleeperUserId: "demo-2" },
    { id: "b2", season: "2023", type: "champion",            label: "Champion",              description: "Won the championship",                       sleeperUserId: "demo-2" },
    { id: "b3", season: "2025", type: "highest_week",        label: "Highest Week",         description: "Highest single-week score",  value: "198.4",  week: 8, sleeperUserId: "demo-2" },
    { id: "b4", season: "2022", type: "most_consistent",     label: "Most Consistent",      description: "Fewest points-above/below projection",       sleeperUserId: "demo-2" },
  ],
  "demo-3": [
    { id: "c1", season: "2023", type: "runner_up",           label: "Runner-Up",             description: "Finished 2nd in the championship",           sleeperUserId: "demo-3" },
    { id: "c2", season: "2025", type: "most_transactions",   label: "Most Moves",            description: "Led the league in waiver pickups",           sleeperUserId: "demo-3" },
  ],
  "demo-4": [
    { id: "d1", season: "2021", type: "champion",            label: "Champion",              description: "Won the founding season championship",       sleeperUserId: "demo-4" },
    { id: "d2", season: "2022", type: "biggest_blowout",     label: "Biggest Blowout",      description: "Largest margin of victory in a single game", value: "+78.3", sleeperUserId: "demo-4" },
  ],
};

const DEFAULT_AWARDS: never[] = [];

export async function GET(req: NextRequest) {
  const sleeperUserId = req.nextUrl.searchParams.get("sleeperUserId") ?? "";
  return NextResponse.json({ awards: AWARDS[sleeperUserId] ?? DEFAULT_AWARDS });
}
