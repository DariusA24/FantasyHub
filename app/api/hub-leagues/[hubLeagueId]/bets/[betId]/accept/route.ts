import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export async function POST(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string; betId: string }> }
) {
  const resolvedParams = await context.params;

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

    const bet = await prisma.bet.findUnique({ where: { id: betId } });

    if (!bet || bet.hubLeagueId !== hubLeagueId) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    if (bet.status !== "open") {
      return NextResponse.json({ error: "Bet is no longer open" }, { status: 400 });
    }

    if (bet.creatorId === profile.id) {
      return NextResponse.json({ error: "Cannot accept your own bet" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        hubLeagueId_profileId: {
          hubLeagueId,
          profileId: profile.id,
        },
      },
    });

    if (!wallet || wallet.balance < bet.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const [updatedBet] = await prisma.$transaction([
      prisma.bet.update({
        where: { id: betId },
        data: { takerId: profile.id, status: "accepted" },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
          taker: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: bet.amount } },
      }),
    ]);

    return NextResponse.json({ bet: updatedBet });
  } catch (err) {
    console.error("Error accepting bet:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
