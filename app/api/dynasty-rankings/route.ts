import { NextRequest, NextResponse } from "next/server";

const FANTASYCALC_URL =
  "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&ppr=1";

export const dynamic = "force-dynamic";

// In-memory cache — refreshed every 6 hours
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sleeperId = searchParams.get("sleeperId");

  if (!sleeperId) {
    return NextResponse.json({ error: "Missing sleeperId" }, { status: 400 });
  }

  try {
    const players = await fetchDynastyValues();
    const entry = players.find((p) => p.player?.sleeperId === sleeperId) ?? null;

    console.log(
      `[dynasty-rankings] sleeperId=${sleeperId} → ${entry ? entry.player.name : "not found"} (${players.length} total)`
    );

    return NextResponse.json({ player: entry });
  } catch (e: any) {
    console.error("[dynasty-rankings] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
