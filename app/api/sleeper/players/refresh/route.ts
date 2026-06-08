export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma, requireAuthUser } from "@/utils/db";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    // 0) auth check: require logged-in user
    let user;
    try {
      user = await requireAuthUser();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // OPTIONAL: enforce admin-only access (adapt to your setup)
    // if (!user.publicMetadata?.isAdmin) {
    //   return NextResponse.json(
    //     { error: "Forbidden" },
    //     { status: 403 }
    //   );
    // }

    await prisma.$queryRaw`SELECT 1`;

    const latest = await prisma.sleeperPlayer.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    const now = Date.now();
    const lastUpdated = latest?.updatedAt?.getTime() ?? 0;
    const ageMs = now - lastUpdated;

    if (latest && ageMs < CACHE_TTL_MS) {
      return NextResponse.json(
        { status: "ok", source: "cache", lastUpdated: latest.updatedAt.toISOString() },
        { status: 200 }
      );
    }

    const sleeperRes = await fetch("https://api.sleeper.app/v1/players/nfl", { cache: "no-store" });
    if (!sleeperRes.ok) {
      const text = await sleeperRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to fetch Sleeper players", status: sleeperRes.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = (await sleeperRes.json()) as Record<string, any>;
    const entries = Object.entries(data);
    const CHUNK_SIZE = 100;

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);

      await prisma.$transaction(
        chunk.map(([playerId, player]) =>
          prisma.sleeperPlayer.upsert({
            where: { id: playerId },
            update: {
              full_name: player.full_name ?? null,
              position: player.position ?? null,
              team: player.team ?? null,
              rawJson: player,
            },
            create: {
              id: playerId,
              full_name: player.full_name ?? null,
              position: player.position ?? null,
              team: player.team ?? null,
              rawJson: player,
            },
          })
        )
      );
    }

    return NextResponse.json({ status: "ok", source: "refreshed", count: entries.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", message: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}