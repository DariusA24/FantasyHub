import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export async function POST(
  req: Request,
  context:
    | { params: Promise<{ hubLeagueId: string; betId: string }> }
    | { params: { hubLeagueId: string; betId: string } }
) {
  const resolvedParams =
    "then" in (context.params as any)
      ? await (context.params as Promise<{ hubLeagueId: string; betId: string }>)
      : (context.params as { hubLeagueId: string; betId: string });

  const { hubLeagueId, betId } = resolvedParams;

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

    const hubLeague = await prisma.hubLeague.findUnique({
      where: { id: hubLeagueId },
      select: { ownerId: true },
    });

    if (!hubLeague) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    if (hubLeague.ownerId !== profile.id) {
      return NextResponse.json({ error: "Only the league owner can settle bets" }, { status: 403 });
    }

    const bet = await prisma.bet.findUnique({ where: { id: betId } });

    if (!bet || bet.hubLeagueId !== hubLeagueId) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    if (bet.status !== "accepted") {
      return NextResponse.json({ error: "Bet must be accepted before settling" }, { status: 400 });
    }

    const body = await req.json();
    const { result } = body; // "creator" | "taker" | "push"

    if (!["creator", "taker", "push"].includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    }

    const totalPot = bet.amount * 2;
    const transactions: any[] = [
      prisma.bet.update({
        where: { id: betId },
        data: { status: "settled", result, settledAt: new Date() },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
          taker: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      }),
    ];

    if (result === "push") {
      transactions.push(
        prisma.wallet.update({
          where: { hubLeagueId_profileId: { hubLeagueId, profileId: bet.creatorId } },
          data: { balance: { increment: bet.amount } },
        }),
        prisma.wallet.update({
          where: { hubLeagueId_profileId: { hubLeagueId, profileId: bet.takerId! } },
          data: { balance: { increment: bet.amount } },
        })
      );
    } else {
      const winnerId = result === "creator" ? bet.creatorId : bet.takerId!;
      transactions.push(
        prisma.wallet.update({
          where: { hubLeagueId_profileId: { hubLeagueId, profileId: winnerId } },
          data: { balance: { increment: totalPot } },
        })
      );
    }

    const [updatedBet] = await prisma.$transaction(transactions);

    return NextResponse.json({ bet: updatedBet });
  } catch (err) {
    console.error("Error settling bet:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
