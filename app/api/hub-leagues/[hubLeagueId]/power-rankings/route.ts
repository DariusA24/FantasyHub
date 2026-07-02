import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

const SLEEPER = "https://api.sleeper.app/v1";
const CACHE = { next: { revalidate: 1800 } } as RequestInit; // 30 min

export type PowerRankingTeam = {
  rank: number;
  displayName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  isMe: boolean;
};

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({
        where: { clerkId: user.id },
        select: { sleeperProfileId: true },
      }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: {
          seasons: {
            orderBy: { season: "desc" },
            take: 1,
            select: { sleeperLeagueId: true },
          },
        },
      }),
    ]);

    const sleeperLeagueId = hubLeague?.seasons?.[0]?.sleeperLeagueId;
    if (!sleeperLeagueId) {
      return NextResponse.json({ error: "No Sleeper season linked" }, { status: 400 });
    }

    const [rostersRes, usersRes] = await Promise.all([
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/rosters`, CACHE),
      fetch(`${SLEEPER}/league/${sleeperLeagueId}/users`, CACHE),
    ]);

    if (!rostersRes.ok || !usersRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Sleeper data" }, { status: 502 });
    }

    type SleeperRoster = {
      roster_id: number;
      owner_id: string;
      settings?: {
        wins?: number;
        losses?: number;
        ties?: number;
        fpts?: number;
        fpts_decimal?: number;
      };
    };

    const rosters: SleeperRoster[] = await rostersRes.json();
    const users: { user_id: string; display_name: string }[] = await usersRes.json();

    const userMap = new Map(users.map((u) => [u.user_id, u.display_name]));

    // Score = wins * large_constant + fpts (so wins always outweigh any PF difference)
    const scored = rosters.map((r) => {
      const wins = r.settings?.wins ?? 0;
      const losses = r.settings?.losses ?? 0;
      const ties = r.settings?.ties ?? 0;
      const fpts = (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100;
      const score = wins * 100_000 + fpts;
      return { r, wins, losses, ties, fpts, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const rankings: PowerRankingTeam[] = scored.map(({ r, wins, losses, ties, fpts }, i) => ({
      rank: i + 1,
      displayName: userMap.get(r.owner_id) ?? "Unknown",
      wins,
      losses,
      ties,
      pointsFor: fpts,
      isMe: r.owner_id === profile?.sleeperProfileId,
    }));

    return NextResponse.json({ rankings });
  } catch (e: any) {
    console.error("[power-rankings] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}