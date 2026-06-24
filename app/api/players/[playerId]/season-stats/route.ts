import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL = 6 * 60 * 60 * 1000; // 6h — season totals change at most daily

const cache: Record<string, { data: Record<string, number>; expiry: number }> = {};

type Ctx = { params: Promise<{ playerId: string }> | { playerId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ playerId: string }>)
    : (ctx.params as { playerId: string });
}

// GET /api/players/[playerId]/season-stats?season=2025
export async function GET(req: NextRequest, ctx: Ctx) {
  const { playerId } = await rp(ctx);
  const season = req.nextUrl.searchParams.get("season") ?? new Date().getFullYear().toString();
  const key = `${playerId}_${season}`;
  const now = Date.now();

  if (cache[key] && now < cache[key].expiry) {
    return NextResponse.json(cache[key].data);
  }

  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/stats/nfl/player/${playerId}?season_type=regular&season=${season}&grouping=season`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) throw new Error(`Sleeper error: ${res.status}`);

    const raw = await res.json();

    // Sleeper may return an array (weekly objects) or a single season object
    let data: Record<string, number> = {};
    if (Array.isArray(raw)) {
      // Sum weekly stats into season totals
      for (const week of raw) {
        if (!week || typeof week !== "object") continue;
        for (const [k, v] of Object.entries(week)) {
          if (typeof v === "number") data[k] = (data[k] ?? 0) + v;
        }
      }
      // gp = number of weeks with any stats
      data.gp = raw.filter((w: any) => w && typeof w === "object" && Object.keys(w).length > 0).length;
    } else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "number") data[k] = v;
      }
    }

    cache[key] = { data, expiry: now + TTL };
    return NextResponse.json(data);
  } catch (e: any) {
    if (cache[key]) return NextResponse.json(cache[key].data);
    // Return empty object — modal renders dashes gracefully
    return NextResponse.json({});
  }
}
