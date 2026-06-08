import { NextRequest, NextResponse } from "next/server";

// Cache the full player list for 24 hours server-side
let cachedPlayers: Record<string, any> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchAllNflPlayers(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedPlayers && now < cacheExpiry) {
    return cachedPlayers;
  }

  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FantasyHub/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`Sleeper /players/nfl error: ${res.status}`);
  }

  cachedPlayers = await res.json();
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedPlayers!;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);

  try {
    const allPlayers = await fetchAllNflPlayers();

    const result: Record<string, { player_id: string; full_name: string | null; position: string | null; team: string | null }> = {};
    for (const id of ids) {
      const p = allPlayers[id];
      if (p) {
        result[id] = {
          player_id: id,
          full_name: p.full_name ?? null,
          position: p.position ?? null,
          team: p.team ?? null,
        };
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[sleeper/players] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}