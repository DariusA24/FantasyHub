import { NextResponse } from "next/server";

const MOCK_BETS = [
  {
    id: "demo-bet-1",
    type: "season",
    title: "Marcus wins the championship",
    description: "He's been talking trash all season. Put your money where your mouth is.",
    amount: 20,
    status: "accepted",
    result: null,
    season: "2025",
    week: null,
    createdAt: "2025-09-01T00:00:00.000Z",
    creator: { id: 2, username: "marcusw", firstName: "Marcus", lastName: "W.", profileImage: "" },
    taker:   { id: 1, username: "demouser", firstName: "You", lastName: "", profileImage: "" },
  },
  {
    id: "demo-bet-2",
    type: "h2h",
    title: "You outscore Tyler in Week 14",
    description: null,
    amount: 10,
    status: "settled",
    result: "creator",
    season: "2025",
    week: 14,
    createdAt: "2025-11-20T00:00:00.000Z",
    creator: { id: 1, username: "demouser", firstName: "You",   lastName: "",    profileImage: "" },
    taker:   { id: 3, username: "tylerrr",  firstName: "Tyler", lastName: "R.",  profileImage: "" },
  },
  {
    id: "demo-bet-3",
    type: "season",
    title: "Most points scored in Week 13",
    description: "Winner takes the pot. High scorer that week gets bragging rights.",
    amount: 15,
    status: "open",
    result: null,
    season: "2025",
    week: 13,
    createdAt: "2025-11-10T00:00:00.000Z",
    creator: { id: 4, username: "jordanp", firstName: "Jordan", lastName: "P.", profileImage: "" },
    taker: null,
  },
  {
    id: "demo-bet-4",
    type: "h2h",
    title: "Alex beats Ryan in Week 12",
    description: null,
    amount: 5,
    status: "settled",
    result: "taker",
    season: "2025",
    week: 12,
    createdAt: "2025-11-05T00:00:00.000Z",
    creator: { id: 5, username: "alexc", firstName: "Alex", lastName: "C.", profileImage: "" },
    taker:   { id: 6, username: "ryanm", firstName: "Ryan", lastName: "M.", profileImage: "" },
  },
];

export async function GET() {
  return NextResponse.json({ bets: MOCK_BETS });
}
