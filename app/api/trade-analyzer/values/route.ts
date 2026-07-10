import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache: Record<string, { data: any[]; expiry: number }> = {};

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeagueShelf/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchValues(isDynasty: boolean, numQbs: 1 | 2, ppr: number): Promise<{ data: any[]; stale: boolean }> {
  const key = `${isDynasty}-${numQbs}-${ppr}`;
  const now = Date.now();
  if (cache[key] && now < cache[key].expiry) return { data: cache[key].data, stale: false };

  const url = `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`FantasyCalc API error: ${res.status}`);
    const data = await res.json();
    cache[key] = { data, expiry: now + CACHE_TTL_MS };
    return { data, stale: false };
  } catch (e) {
    // Return stale cache rather than failing completely
    if (cache[key]) return { data: cache[key].data, stale: true };
    throw e;
  }
}

// GET /api/trade-analyzer/values?isDynasty=true&numQbs=1&ppr=1
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const isDynasty = sp.get("isDynasty") !== "false";
  const numQbs = sp.get("numQbs") === "2" ? 2 : 1;
  const ppr = parseFloat(sp.get("ppr") ?? "1");
  const validPpr = [0, 0.5, 1].includes(ppr) ? ppr : 1;

  try {
    const { data: players, stale } = await fetchValues(isDynasty, numQbs, validPpr);

    const map: Record<string, {
      name: string; position: string; team: string;
      value: number; trend: number; redraftValue: number;
      age: number | null; tier: number | null;
    }> = {};

    for (const entry of players) {
      const p = entry.player;
      if (!p?.sleeperId) continue;
      map[p.sleeperId] = {
        name: p.name ?? "",
        position: p.position ?? "",
        team: p.maybeTeam ?? "",
        value: entry.value ?? 0,
        trend: entry.trend30Day ?? entry.overallTrend ?? 0,
        redraftValue: entry.redraftValue ?? 0,
        age: p.maybeAge ?? null,
        tier: entry.maybeTier ?? null,
      };
    }

    return NextResponse.json({ map, stale });
  } catch (e: any) {
    console.error("[trade-analyzer/values]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
