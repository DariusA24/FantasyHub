import { NextResponse } from "next/server";

const FANTASYCALC_URL =
  "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&ppr=1";

export const dynamic = "force-dynamic";

let cache: any[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchDynastyValues(): Promise<any[]> {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;

  const res = await fetch(FANTASYCALC_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FantasyHub/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`FantasyCalc API error: ${res.status} ${res.statusText}`);
  }

  cache = await res.json();
  cacheExpiry = now + CACHE_TTL_MS;
  return cache!;
}

export async function GET() {
  try {
    const players = await fetchDynastyValues();
    return NextResponse.json(players);
  } catch (e: any) {
    console.error("[dynasty-rankings/all] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
