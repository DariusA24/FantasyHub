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

// GET /api/start-sit/vote?players=id1,id2&week=1&season=2025&guestToken=<uuid>
export async function GET(req: NextRequest) {
  const sp         = req.nextUrl.searchParams;
  const ids        = (sp.get("players") ?? "").split(",").filter(Boolean);
  const week       = parseInt(sp.get("week") ?? "");
  const season     = sp.get("season") ?? "";
  const guestToken = sp.get("guestToken") ?? null;

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
    } else if (guestToken) {
      const existing = await prisma.startSitVote.findUnique({
        where: { matchupId_guestToken: { matchupId: matchup.id, guestToken } },
      });
      myVote = existing?.chosenPlayerId ?? null;
    }
  } catch {
    // unauthenticated — fine
  }

  return NextResponse.json({ votes, myVote, total });
}

// POST /api/start-sit/vote
// Body: { playerIds, chosenPlayerId, week, season, guestToken? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerIds, chosenPlayerId, week, season, guestToken } = body as {
    playerIds: string[];
    chosenPlayerId: string;
    week: number;
    season: string;
    guestToken?: string;
  };

  if (!playerIds || playerIds.length < 2 || !chosenPlayerId || !week || !season) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!playerIds.includes(chosenPlayerId)) {
    return NextResponse.json({ error: "Chosen player not in matchup" }, { status: 400 });
  }

  // Resolve voter identity: authenticated profile or guest token
  let profileId: number | null = null;
  let resolvedGuestToken: string | null = null;

  try {
    const user = await getAuthUser();
    if (user) {
      const profile = await prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });
      if (profile) profileId = profile.id;
    }
  } catch {}

  if (!profileId) {
    if (!guestToken || guestToken.length < 10) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    resolvedGuestToken = guestToken;
  }

  const playerKey = makePlayerKey(playerIds);
  const matchup = await prisma.startSitMatchup.upsert({
    where: { playerKey_week_season: { playerKey, week, season } },
    create: { playerKey, week, season },
    update: {},
  });

  if (profileId !== null) {
    await prisma.startSitVote.upsert({
      where: { matchupId_profileId: { matchupId: matchup.id, profileId } },
      create: { matchupId: matchup.id, profileId, chosenPlayerId },
      update: { chosenPlayerId },
    });
  } else {
    await prisma.startSitVote.upsert({
      where: { matchupId_guestToken: { matchupId: matchup.id, guestToken: resolvedGuestToken! } },
      create: { matchupId: matchup.id, guestToken: resolvedGuestToken, chosenPlayerId },
      update: { chosenPlayerId },
    });
  }

  const votes = await getVoteCounts(matchup.id);
  const total = Object.values(votes).reduce((s, n) => s + n, 0);

  return NextResponse.json({ votes, myVote: chosenPlayerId, total });
}
