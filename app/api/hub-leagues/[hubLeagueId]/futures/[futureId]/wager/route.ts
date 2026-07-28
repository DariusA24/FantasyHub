import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

const SLEEPER = "https://api.sleeper.app/v1";

// POST /api/hub-leagues/[hubLeagueId]/futures/[futureId]/wager — bet a futures option
export async function POST(
  req: Request,
  context: { params: Promise<{ hubLeagueId: string; futureId: string }> }
) {
  const { hubLeagueId, futureId } = await context.params;

  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const optionId = String(body.optionId ?? "");
    const stake = parseInt(body.stake, 10);

    if (!optionId) return NextResponse.json({ error: "Pick an option" }, { status: 400 });
    if (!stake || stake <= 0) return NextResponse.json({ error: "Enter a valid stake" }, { status: 400 });

    const future = await prisma.betFuture.findUnique({
      where: { id: futureId },
      include: { options: true },
    });
    if (!future || future.hubLeagueId !== hubLeagueId) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    if (future.status !== "open") {
      return NextResponse.json({ error: "This market is closed" }, { status: 400 });
    }

    const option = future.options.find((o) => o.id === optionId);
    if (!option) return NextResponse.json({ error: "Invalid option" }, { status: 400 });

    // Betting closes once the regular season reaches the future's closesWeek.
    const stateRes = await fetch(`${SLEEPER}/state/nfl`, { next: { revalidate: 300 } } as RequestInit);
    if (stateRes.ok) {
      const state: { week: number; season: string; season_type: string } = await stateRes.json();
      const closed =
        state.season > future.season ||
        state.season_type === "post" ||
        (state.season === future.season &&
          state.season_type === "regular" &&
          Number(state.week) >= future.closesWeek);
      if (closed) {
        return NextResponse.json({ error: "Betting has closed for this market" }, { status: 400 });
      }
    }

    const existing = await prisma.betFutureWager.findUnique({
      where: { optionId_profileId: { optionId, profileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a bet on this option" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });
    if (!wallet || wallet.balance < stake) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const [wager] = await prisma.$transaction([
      prisma.betFutureWager.create({
        data: {
          futureId,
          optionId,
          profileId: profile.id,
          stake,
          odds: option.odds,
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: stake } },
      }),
    ]);

    return NextResponse.json({ wager }, { status: 201 });
  } catch (err) {
    console.error("[futures wager POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
