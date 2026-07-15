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
    const { type, title, description, amount, season, week } = body;

    if (!type || !title || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
