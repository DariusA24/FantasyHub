import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      transaction_id: "demo-trade-1",
      when: "2h ago",
      teams: [
        { displayName: "Marcus W.", players: [{ name: "CeeDee Lamb",      position: "WR" }], picks: ["2026 1st"] },
        { displayName: "Tyler R.",  players: [{ name: "Justin Jefferson",  position: "WR" }, { name: "Saquon Barkley", position: "RB" }], picks: [] },
      ],
    },
    {
      transaction_id: "demo-trade-2",
      when: "1d ago",
      teams: [
        { displayName: "Jordan P.", players: [{ name: "Ja'Marr Chase", position: "WR" }], picks: ["2025 2nd"] },
        { displayName: "Alex C.",   players: [{ name: "Tyreek Hill",   position: "WR" }], picks: ["2026 1st"] },
      ],
    },
    {
      transaction_id: "demo-trade-3",
      when: "3d ago",
      teams: [
        { displayName: "Your Team", players: [{ name: "Tony Pollard",   position: "RB" }], picks: ["2025 1st"] },
        { displayName: "Chris B.",  players: [{ name: "Derrick Henry",  position: "RB" }], picks: [] },
      ],
    },
  ]);
}
