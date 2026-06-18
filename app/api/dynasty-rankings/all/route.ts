import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Separate caches for 1QB and 2QB (SF) so they don't overwrite each other
const cache: Record<string, { data: any[]; expiry: number }> = {};

async function fetchDynastyValues(numQbs: 1 | 2): Promise<any[]> {
  const key = String(numQbs);
  const now = Date.now();
  if (cache[key] && now < cache[key].expiry) return cache[key].data;

  const url = `https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=${numQbs}&ppr=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FantasyHub/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`FantasyCalc API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cache[key] = { data, expiry: now + CACHE_TTL_MS };
  return data;
}

export async function GET(req: NextRequest) {
  const numQbs = req.nextUrl.searchParams.get("numQbs") === "2" ? 2 : 1;

  try {
    const players = await fetchDynastyValues(numQbs);
    return NextResponse.json(players);
  } catch (e: any) {
    console.error("[dynasty-rankings/all] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
