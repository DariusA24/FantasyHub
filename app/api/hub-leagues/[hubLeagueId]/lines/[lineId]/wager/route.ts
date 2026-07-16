import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { isWeekLocked } from "@/utils/bettingLines";

const PICKS = ["home", "away", "over", "under"] as const;
type Pick = (typeof PICKS)[number];

// POST /api/hub-leagues/[hubLeagueId]/lines/[lineId]/wager — place a bet against the house
export async function POST(
  req: Request,
  context: { params: Promise<{ hubLeagueId: string; lineId: string }> }
) {
  const resolvedParams = await context.params;

  const { hubLeagueId, lineId } = resolvedParams;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const pick = body.pick as Pick;
    const stake = parseInt(body.stake, 10);

    if (!PICKS.includes(pick)) {
      return NextResponse.json({ error: "Invalid pick" }, { status: 400 });
    }
    if (!stake || stake <= 0) {
      return NextResponse.json({ error: "Enter a valid stake" }, { status: 400 });
    }

    const line = await prisma.betLine.findUnique({ where: { id: lineId } });

    if (!line || line.hubLeagueId !== hubLeagueId) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }
    if (line.status !== "open") {
      return NextResponse.json({ error: "This line is no longer open" }, { status: 400 });
    }

    const stateRes = await fetch("https://api.sleeper.app/v1/state/nfl", {
      next: { revalidate: 300 },
    } as RequestInit);
    const seasonType: string = stateRes.ok
      ? (await stateRes.json()).season_type
      : "regular"; // if state is unavailable, fail toward the stricter lock rule
    if (isWeekLocked(seasonType)) {
      return NextResponse.json(
        { error: "Lines are locked for the week — games are underway" },
        { status: 400 }
      );
    }

    const existing = await prisma.betWager.findUnique({
      where: { lineId_profileId_pick: { lineId, profileId: profile.id, pick } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a wager on this pick" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });

    if (!wallet || wallet.balance < stake) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const odds =
      pick === "home"
        ? line.homeOdds
        : pick === "away"
        ? line.awayOdds
        : pick === "over"
        ? line.overOdds
        : line.underOdds;

    const [wager] = await prisma.$transaction([
      prisma.betWager.create({
        data: {
          lineId,
          profileId: profile.id,
          pick,
          stake,
          odds,
        },
        include: {
          profile: { select: { id: true, username: true } },
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: stake } },
      }),
    ]);

    return NextResponse.json({ wager }, { status: 201 });
  } catch (err) {
    console.error("Error placing wager:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
