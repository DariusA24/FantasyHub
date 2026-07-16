import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hubLeague: {
      id: "demo",
      name: "Gridiron Kings",
      description: "Five seasons deep and still going. The most competitive group of guys you'll ever find on a Thursday night.",
      punishment: "24 hours in a Waffle House — every waffle eaten knocks off an hour",
      createdAt: "2021-07-01T00:00:00.000Z",
      ownerId: 1,
      owner: {
        id: 1,
        username: "demouser",
        firstName: "You",
        lastName: "",
        profileImage: "",
      },
      seasons: [
        {
          id: "demo-season-2025",
          sleeperLeagueId: "demo",
          season: "2025",
          sleeperName: "Gridiron Kings 2025",
          sleeperSport: "nfl",
          createdAt: "2025-08-01T00:00:00.000Z",
        },
      ],
      members: [
        { profileId: 1, role: "owner",  createdAt: "2021-07-01T00:00:00.000Z", profile: { id: 1, username: "demouser", firstName: "You",     lastName: "",        profileImage: "" } },
        { profileId: 2, role: "member", createdAt: "2021-07-01T00:00:00.000Z", profile: { id: 2, username: "marcusw",  firstName: "Marcus",  lastName: "W.",       profileImage: "" } },
        { profileId: 3, role: "member", createdAt: "2021-07-01T00:00:00.000Z", profile: { id: 3, username: "tylerrr",  firstName: "Tyler",   lastName: "R.",       profileImage: "" } },
      ],
    },
    isOwner: false,
    lastSyncedAt: new Date().toISOString(),
  });
}
