import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// GET /api/sleeper/players/search?q=Justin+Jefferson&limit=10
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 30);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const players = await prisma.sleeperPlayer.findMany({
      where: {
        full_name: { contains: q, mode: "insensitive" },
        position: { in: ["QB", "RB", "WR", "TE", "K"] },
        team: { not: null },
      },
      select: { id: true, full_name: true, position: true, team: true, rawJson: true },
      orderBy: { full_name: "asc" },
      take: limit,
    });

    const result = players.map((p) => {
      const raw = p.rawJson as Record<string, unknown> | null;
      return {
        id: p.id,
        full_name: p.full_name,
        position: p.position,
        team: p.team,
        injury_status: (raw?.injury_status as string | null) ?? null,
      };
    });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[sleeper/players/search] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
