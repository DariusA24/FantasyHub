import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ leagueId: string }> | { leagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ leagueId: string }>)
    : (ctx.params as { leagueId: string });
}

const SLEEPER = "https://api.sleeper.app/v1";
const CACHE = { next: { revalidate: 1800 } } as RequestInit;

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { leagueId } = await resolveParams(ctx);

  try {
    // Get current NFL week + rosters + users in parallel
    const [stateRes, rostersRes, usersRes] = await Promise.all([
      fetch(`${SLEEPER}/state/nfl`, CACHE),
      fetch(`${SLEEPER}/league/${leagueId}/rosters`, CACHE),
      fetch(`${SLEEPER}/league/${leagueId}/users`, CACHE),
    ]);

    const state: { week: number } = stateRes.ok ? await stateRes.json() : { week: 1 };
    const currentWeek = Math.max(1, state.week);
    const weeks = [currentWeek, currentWeek - 1, currentWeek - 2].filter((w) => w >= 1);

    // Fetch transactions for last 3 weeks in parallel
    const txResponses = await Promise.all(
      weeks.map((w) => fetch(`${SLEEPER}/league/${leagueId}/transactions/${w}`, CACHE))
    );

    // Build lookup maps
    const rosters: { roster_id: number; owner_id: string }[] = rostersRes.ok ? await rostersRes.json() : [];
    const users: { user_id: string; display_name: string }[] = usersRes.ok ? await usersRes.json() : [];

    const userMap = new Map(users.map((u) => [u.user_id, u.display_name]));
    const rosterOwnerMap = new Map(rosters.map((r) => [r.roster_id, r.owner_id]));

    // Collect completed trades across all fetched weeks
    const allTrades: any[] = [];
    for (const res of txResponses) {
      if (!res.ok) continue;
      const txs: any[] = await res.json();
      allTrades.push(...txs.filter((t) => t.type === "trade" && t.status === "complete"));
    }

    // Most recent 5
    allTrades.sort((a, b) => b.created - a.created);
    const recent = allTrades.slice(0, 5);

    // Collect player IDs to resolve from DB
    const playerIds = new Set<string>();
    for (const trade of recent) {
      if (trade.adds) Object.keys(trade.adds).forEach((id) => playerIds.add(id));
    }

    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: Array.from(playerIds) } },
      select: { id: true, full_name: true, position: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // Enrich each trade
    const enriched = recent.map((trade) => {
      // Group received assets by roster_id
      const byRoster = new Map<number, { players: { name: string; position: string | null }[]; picks: string[] }>();

      if (trade.adds) {
        for (const [playerId, rosterId] of Object.entries(trade.adds as Record<string, number>)) {
          if (!byRoster.has(rosterId)) byRoster.set(rosterId, { players: [], picks: [] });
          const p = playerMap.get(playerId);
          byRoster.get(rosterId)!.players.push({
            name: p?.full_name ?? `Player ${playerId}`,
            position: p?.position ?? null,
          });
        }
      }

      if (trade.draft_picks) {
        for (const pick of trade.draft_picks as any[]) {
          const rosterId: number = pick.owner_id ?? pick.roster_id_to;
          if (!byRoster.has(rosterId)) byRoster.set(rosterId, { players: [], picks: [] });
          const label = `${pick.season} Rd ${pick.round}`;
          byRoster.get(rosterId)!.picks.push(label);
        }
      }

      const teams = Array.from(byRoster.entries()).map(([rosterId, assets]) => {
        const ownerId = rosterOwnerMap.get(rosterId);
        const displayName = ownerId ? (userMap.get(ownerId) ?? "Unknown") : "Unknown";
        return { displayName, ...assets };
      });

      return {
        transaction_id: trade.transaction_id as string,
        when: timeAgo(trade.created),
        teams,
      };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    console.error("[trades] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
