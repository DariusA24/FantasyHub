import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// GET /api/sleeper/players/batch?ids=id1,id2,id3
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);

  if (ids.length === 0) return NextResponse.json([]);

  try {
    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: ids } },
      select: { id: true, full_name: true, position: true, team: true },
    });
    return NextResponse.json(players);
  } catch (e: any) {
    console.error("[sleeper/players/batch]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
