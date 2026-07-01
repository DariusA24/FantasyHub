import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// DB cache TTL: 24h for past seasons, 6h for current season
const CURRENT_SEASON = 2025;
const TTL_CURRENT = 6 * 60 * 60 * 1000;   // 6h
const TTL_PAST    = 24 * 60 * 60 * 1000;  // 24h

type Ctx = { params: Promise<{ playerId: string }> | { playerId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ playerId: string }>)
    : (ctx.params as { playerId: string });
}

async function fetchWeek(season: string, week: number, playerId: string): Promise<Record<string, number>> {
  const res = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`,
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) return {};
  const all = await res.json();
  return all?.[playerId] ?? {};
}

async function fetchFromSleeper(playerId: string, season: string): Promise<Record<string, number>> {
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  const weekResults = await Promise.allSettled(
    weeks.map((w) => fetchWeek(season, w, playerId))
  );

  const data: Record<string, number> = {};
  let gp = 0;

  for (const result of weekResults) {
    if (result.status !== "fulfilled") continue;
    const w = result.value;
    if (!w || Object.keys(w).length === 0) continue;
    if ((w.gms_active ?? 0) > 0 || (w.gp ?? 0) > 0 || (w.pts_ppr ?? 0) > 0) gp++;
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === "number" && k !== "gp" && k !== "gms_active") {
        data[k] = (data[k] ?? 0) + v;
      }
    }
  }

  data.gp = gp;
  return data;
}

// GET /api/players/[playerId]/season-stats?season=2024
export async function GET(req: NextRequest, ctx: Ctx) {
  const { playerId } = await rp(ctx);
  const season = parseInt(req.nextUrl.searchParams.get("season") ?? String(CURRENT_SEASON));
  const ttl = season >= CURRENT_SEASON ? TTL_CURRENT : TTL_PAST;

  try {
    // 1. Check DB cache
    const cached = await prisma.playerSeasonStatsCache.findUnique({
      where: { playerId_season: { playerId, season } },
    });

    if (cached) {
      const age = Date.now() - cached.fetchedAt.getTime();
      if (age < ttl) {
        return NextResponse.json(cached.stats);
      }
    }

    // 2. Fetch from Sleeper (18 parallel weekly calls)
    const data = await fetchFromSleeper(playerId, String(season));

    // 3. Persist to DB (upsert)
    await prisma.playerSeasonStatsCache.upsert({
      where: { playerId_season: { playerId, season } },
      update: { stats: data, fetchedAt: new Date() },
      create: { playerId, season, stats: data },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("[season-stats]", e);
    return NextResponse.json({});
  }
}
