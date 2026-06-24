import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL = 24 * 60 * 60 * 1000; // 24h — past-week stats are immutable

type StatsEntry = { pts_ppr: number; pts_half_ppr: number; pts_std: number };

const cache: Record<string, { data: Record<string, StatsEntry>; expiry: number }> = {};

// GET /api/start-sit/stats?week=1&season=2025
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const week   = sp.get("week");
  const season = sp.get("season");

  if (!week || !season) {
    return NextResponse.json({ error: "Missing week or season" }, { status: 400 });
  }

  const key = `${season}_${week}`;
  const now = Date.now();

  if (cache[key] && now < cache[key].expiry) {
    return NextResponse.json({ stats: cache[key].data });
  }

  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) throw new Error(`Sleeper stats error: ${res.status}`);

    const raw = await res.json() as Record<string, any>;

    const stats: Record<string, StatsEntry> = {};
    for (const [id, entry] of Object.entries(raw)) {
      if (!entry || typeof entry !== "object") continue;
      const pts_ppr      = Number(entry.pts_ppr ?? 0);
      const pts_half_ppr = Number(entry.pts_half_ppr ?? 0);
      const pts_std      = Number(entry.pts_std ?? 0);
      if (pts_ppr > 0 || pts_half_ppr > 0 || pts_std > 0) {
        stats[id] = { pts_ppr, pts_half_ppr, pts_std };
      }
    }

    cache[key] = { data: stats, expiry: now + TTL };
    return NextResponse.json({ stats });
  } catch (e: any) {
    if (cache[key]) return NextResponse.json({ stats: cache[key].data, stale: true });
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 502 });
  }
}
