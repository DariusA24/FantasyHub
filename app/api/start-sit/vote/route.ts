import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

function makePlayerKey(ids: string[]) {
  return [...ids].sort().join("_");
}

async function getVoteCounts(matchupId: string): Promise<Record<string, number>> {
  const rows = await prisma.startSitVote.groupBy({
    by: ["chosenPlayerId"],
    where: { matchupId },
    _count: { chosenPlayerId: true },
  });
  return Object.fromEntries(rows.map((r) => [r.chosenPlayerId, r._count.chosenPlayerId]));
}

// GET /api/start-sit/vote?players=id1,id2&week=1&season=2025
export async function GET(req: NextRequest) {
  const sp      = req.nextUrl.searchParams;
  const ids     = (sp.get("players") ?? "").split(",").filter(Boolean);
  const week    = parseInt(sp.get("week") ?? "");
  const season  = sp.get("season") ?? "";

  if (ids.length < 2 || !week || !season) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const playerKey = makePlayerKey(ids);

  const matchup = await prisma.startSitMatchup.findUnique({
    where: { playerKey_week_season: { playerKey, week, season } },
  });

  if (!matchup) {
    return NextResponse.json({ votes: {}, myVote: null, total: 0 });
  }

  const votes = await getVoteCounts(matchup.id);
  const total = Object.values(votes).reduce((s, n) => s + n, 0);

  // Check if logged-in user has voted
  let myVote: string | null = null;
  try {
    const user = await getAuthUser();
    if (user) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });
      if (profile) {
        const existing = await prisma.startSitVote.findUnique({
          where: { matchupId_profileId: { matchupId: matchup.id, profileId: profile.id } },
        });
        myVote = existing?.chosenPlayerId ?? null;
      }
    }
  } catch {
    // unauthenticated — fine
  }

  return NextResponse.json({ votes, myVote, total });
}

// POST /api/start-sit/vote
// Body: { playerIds: string[], chosenPlayerId: string, week: number, season: string }
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { clerkId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await req.json();
  const { playerIds, chosenPlayerId, week, season } = body as {
    playerIds: string[];
    chosenPlayerId: string;
    week: number;
    season: string;
  };

  if (!playerIds || playerIds.length < 2 || !chosenPlayerId || !week || !season) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!playerIds.includes(chosenPlayerId)) {
    return NextResponse.json({ error: "Chosen player not in matchup" }, { status: 400 });
  }

  const playerKey = makePlayerKey(playerIds);

  // Upsert the matchup
  const matchup = await prisma.startSitMatchup.upsert({
    where: { playerKey_week_season: { playerKey, week, season } },
    create: { playerKey, week, season },
    update: {},
  });

  // Upsert the vote (allow changing vote)
  await prisma.startSitVote.upsert({
    where: { matchupId_profileId: { matchupId: matchup.id, profileId: profile.id } },
    create: { matchupId: matchup.id, profileId: profile.id, chosenPlayerId },
    update: { chosenPlayerId },
  });

  const votes = await getVoteCounts(matchup.id);
  const total = Object.values(votes).reduce((s, n) => s + n, 0);

  return NextResponse.json({ votes, myVote: chosenPlayerId, total });
}
