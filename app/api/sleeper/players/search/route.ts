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
      },
      select: { id: true, full_name: true, position: true, team: true },
      orderBy: { full_name: "asc" },
      take: limit,
    });

    return NextResponse.json(players);
  } catch (e: any) {
    console.error("[sleeper/players/search] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
