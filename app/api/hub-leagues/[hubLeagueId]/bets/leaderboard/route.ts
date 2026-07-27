import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };

// GET /api/hub-leagues/[hubLeagueId]/bets/leaderboard
// Coin standings + betting records for every member of the hub league.
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const [membership, hubLeague] = await Promise.all([
      prisma.hubLeagueMember.findUnique({
        where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
      }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: { ownerId: true },
      }),
    ]);
    if (!membership && profile.id !== hubLeague?.ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [members, wallets, wagers, p2pBets] = await Promise.all([
      prisma.hubLeagueMember.findMany({
        where: { hubLeagueId },
        include: {
          profile: {
            select: { id: true, username: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      }),
      prisma.wallet.findMany({
        where: { hubLeagueId },
        select: { profileId: true, balance: true },
      }),
      prisma.betWager.findMany({
        where: { line: { hubLeagueId } },
        select: { profileId: true, stake: true, payout: true, status: true },
      }),
      prisma.bet.findMany({
        where: { hubLeagueId, status: "settled" },
        select: { creatorId: true, takerId: true, amount: true, result: true },
      }),
    ]);

    const balanceMap = new Map(wallets.map((w) => [w.profileId, w.balance]));

    type HouseStats = { wins: number; losses: number; pushes: number; net: number; biggestWin: number; pending: number };
    const houseMap = new Map<number, HouseStats>();
    const houseFor = (id: number): HouseStats => {
      const cur = houseMap.get(id) ?? { wins: 0, losses: 0, pushes: 0, net: 0, biggestWin: 0, pending: 0 };
      houseMap.set(id, cur);
      return cur;
    };
    for (const w of wagers) {
      const h = houseFor(w.profileId);
      if (w.status === "pending") {
        h.pending += w.stake;
      } else if (w.status === "won") {
        const profit = (w.payout ?? 0) - w.stake;
        h.wins++;
        h.net += profit;
        if (profit > h.biggestWin) h.biggestWin = profit;
      } else if (w.status === "lost") {
        h.losses++;
        h.net -= w.stake;
      } else if (w.status === "push") {
        h.pushes++;
      }
      // void: stake refunded, no record impact
    }

    type P2PStats = { wins: number; losses: number; net: number };
    const p2pMap = new Map<number, P2PStats>();
    const p2pFor = (id: number): P2PStats => {
      const cur = p2pMap.get(id) ?? { wins: 0, losses: 0, net: 0 };
      p2pMap.set(id, cur);
      return cur;
    };
    for (const b of p2pBets) {
      if (b.takerId == null || b.result === "push" || b.result == null) continue;
      const winnerId = b.result === "creator" ? b.creatorId : b.takerId;
      const loserId = b.result === "creator" ? b.takerId : b.creatorId;
      const winner = p2pFor(winnerId);
      winner.wins++;
      winner.net += b.amount;
      const loser = p2pFor(loserId);
      loser.losses++;
      loser.net -= b.amount;
    }

    const standings = members
      .map((m) => {
        const house = houseMap.get(m.profileId) ?? { wins: 0, losses: 0, pushes: 0, net: 0, biggestWin: 0, pending: 0 };
        const p2p = p2pMap.get(m.profileId) ?? { wins: 0, losses: 0, net: 0 };
        return {
          profileId: m.profileId,
          username: m.profile.username,
          name: `${m.profile.firstName} ${m.profile.lastName}`.trim() || m.profile.username,
          profileImage: m.profile.profileImage || null,
          balance: balanceMap.get(m.profileId) ?? 10000,
          house,
          p2p,
          totalNet: house.net + p2p.net,
        };
      })
      .sort((a, b) => b.balance - a.balance);

    return NextResponse.json({ standings });
  } catch (e: any) {
    console.error("[bets/leaderboard GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
