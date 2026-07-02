import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL = 2 * 60 * 60 * 1000; // 2 hours — projections update a few times per day

type ProjectionEntry = {
  pts_ppr: number;
  pts_half_ppr: number;
  pts_std: number;
  [key: string]: number;
};

const cache: Record<string, { data: Record<string, ProjectionEntry>; expiry: number }> = {};

// GET /api/start-sit/projections?week=1&season=2025
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
    return NextResponse.json({ projections: cache[key].data });
  }

  const url = `https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}?position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Sleeper projections error: ${res.status}`);

    const raw = await res.json();

    // Normalize: only keep players with at least one projection value
    const projections: Record<string, ProjectionEntry> = {};
    for (const [id, entry] of Object.entries(raw as Record<string, any>)) {
      if (!entry || typeof entry !== "object") continue;
      const pts_ppr      = Number(entry.pts_ppr ?? 0);
      const pts_half_ppr = Number(entry.pts_half_ppr ?? 0);
      const pts_std      = Number(entry.pts_std ?? pts_ppr * 0.8); // fallback
      if (pts_ppr > 0 || pts_half_ppr > 0 || pts_std > 0) {
        projections[id] = { ...entry, pts_ppr, pts_half_ppr, pts_std };
      }
    }

    cache[key] = { data: projections, expiry: now + TTL };
    return NextResponse.json({ projections });
  } catch (e: any) {
    if (cache[key]) return NextResponse.json({ projections: cache[key].data, stale: true });
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 502 });
  }
}
