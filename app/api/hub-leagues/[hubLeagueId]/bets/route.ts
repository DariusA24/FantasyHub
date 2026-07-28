import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const resolvedParams = await context.params;

  const hubLeagueId = resolvedParams.hubLeagueId;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bets = await prisma.bet.findMany({
      where: { hubLeagueId },
      include: {
        creator: {
          select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
        },
        taker: {
          select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bets });
  } catch (err) {
    console.error("Error fetching bets:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const resolvedParams = await context.params;

  const hubLeagueId = resolvedParams.hubLeagueId;

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
    const { type, title, description, amount, season, week, terms } = body;
    // H2H bets are non-currency: they carry custom free-text terms and a tracked
    // record instead of escrowing coins. Season bets still use the coin economy.
    const stakeType: "coins" | "terms" = type === "h2h" ? "terms" : "coins";

    if (!type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (stakeType === "terms") {
      if (!terms || !String(terms).trim()) {
        return NextResponse.json({ error: "Enter the stakes for this bet" }, { status: 400 });
      }

      const bet = await prisma.bet.create({
        data: {
          hubLeagueId,
          creatorId: profile.id,
          type,
          stakeType,
          title,
          description: description || null,
          terms: String(terms).trim(),
          amount: 0,
          season: season || null,
          week: week || null,
        },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      });

      return NextResponse.json({ bet }, { status: 201 });
    }

    // Coin-staked bet — escrow the stake from the creator's wallet
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid wager amount" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        hubLeagueId_profileId: {
          hubLeagueId,
          profileId: profile.id,
        },
      },
    });

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const [bet] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          hubLeagueId,
          creatorId: profile.id,
          type,
          stakeType,
          title,
          description: description || null,
          amount,
          season: season || null,
          week: week || null,
        },
        include: {
          creator: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
    ]);

    return NextResponse.json({ bet }, { status: 201 });
  } catch (err) {
    console.error("Error creating bet:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
