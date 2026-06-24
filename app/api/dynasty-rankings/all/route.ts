import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache: Record<string, { data: any[]; expiry: number }> = {};

async function fetchValues(isDynasty: boolean, numQbs: 1 | 2, ppr: 0 | 0.5 | 1): Promise<any[]> {
  const key = `${isDynasty ? "d" : "r"}_${numQbs}_${ppr}`;
  const now = Date.now();
  if (cache[key] && now < cache[key].expiry) return cache[key].data;

  const url = `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FantasyHub/1.0)" },
  });

  if (!res.ok) throw new Error(`FantasyCalc API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  cache[key] = { data, expiry: now + CACHE_TTL_MS };
  return data;
}

export async function GET(req: NextRequest) {
  const params    = req.nextUrl.searchParams;
  const isDynasty = params.get("isDynasty") !== "false";
  const numQbs    = params.get("numQbs") === "2" ? 2 : 1;
  const pprRaw    = parseFloat(params.get("ppr") ?? "1");
  const ppr       = ([0, 0.5, 1] as const).includes(pprRaw as any) ? (pprRaw as 0 | 0.5 | 1) : 1;

  try {
    const players = await fetchValues(isDynasty, numQbs, ppr);
    return NextResponse.json(players);
  } catch (e: any) {
    console.error("[dynasty-rankings/all] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
