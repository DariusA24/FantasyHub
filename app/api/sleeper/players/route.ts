import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);

  try {
    // ── 1. Try DB first ───────────────────────────────────────────────────
    const dbPlayers = await prisma.sleeperPlayer.findMany({
      where: { id: { in: ids } },
      select: { id: true, full_name: true, position: true, team: true },
    });

    if (dbPlayers.length > 0) {
      const result: Record<string, { player_id: string; full_name: string | null; position: string | null; team: string | null }> = {};
      for (const p of dbPlayers) {
        result[p.id] = { player_id: p.id, full_name: p.full_name, position: p.position, team: p.team };
      }
      return NextResponse.json(result);
    }

    // ── 2. DB empty — fall back to live Sleeper API ───────────────────────
    console.warn("[sleeper/players] DB empty, falling back to Sleeper API. Run /api/sleeper/players/refresh to seed.");

    const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeagueShelf/1.0)" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) throw new Error(`Sleeper /players/nfl error: ${res.status}`);

    const allPlayers: Record<string, any> = await res.json();

    const result: Record<string, { player_id: string; full_name: string | null; position: string | null; team: string | null }> = {};
    for (const id of ids) {
      const p = allPlayers[id];
      if (p) {
        result[id] = { player_id: id, full_name: p.full_name ?? null, position: p.position ?? null, team: p.team ?? null };
      }
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[sleeper/players] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
