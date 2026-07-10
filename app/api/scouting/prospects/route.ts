import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

const FC_CACHE_TTL = 6 * 60 * 60 * 1000;
let fcCache: { data: any[]; expiry: number } | null = null;

async function fetchFCValues(): Promise<any[]> {
  const now = Date.now();
  if (fcCache && now < fcCache.expiry) return fcCache.data;

  const res = await fetch(
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&ppr=1",
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeagueShelf/1.0)" },
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) throw new Error(`FantasyCalc API error: ${res.status}`);
  const data = await res.json();
  fcCache = { data, expiry: now + FC_CACHE_TTL };
  return data;
}

const CURRENT_YEAR = 2026;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const classYearParam = sp.get("classYear");
  const classYear = classYearParam && classYearParam !== "ALL" ? parseInt(classYearParam) : null;
  const position = sp.get("position") ?? "ALL";

  try {
    const fcData = await fetchFCValues();

    // Top 800 by dynasty value
    const sorted = [...fcData]
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 800);

    const sleeperIds = sorted
      .map((e) => e.player?.sleeperId)
      .filter(Boolean) as string[];

    // Bulk fetch rawJson for years_exp
    const sleeperPlayers = await prisma.sleeperPlayer.findMany({
      where: { id: { in: sleeperIds } },
      select: { id: true, rawJson: true },
    });

    const sleeperMap = new Map(
      sleeperPlayers.map((p) => [p.id, p.rawJson as Record<string, unknown>])
    );

    const prospects = [];

    for (const entry of sorted) {
      const p = entry.player;
      if (!p?.sleeperId) continue;

      const raw = sleeperMap.get(p.sleeperId);
      const yearsExp =
        raw?.years_exp !== undefined && raw.years_exp !== null
          ? (raw.years_exp as number)
          : undefined;
      const age = p.maybeAge as number | null;

      let pClassYear: number;
      if (yearsExp !== undefined) {
        pClassYear = CURRENT_YEAR - yearsExp;
      } else if (age !== null && age !== undefined) {
        // Approximate: most players enter NFL at ~21.5 years old
        pClassYear = Math.round(CURRENT_YEAR - Math.max(0, age - 21.5));
      } else {
        continue;
      }

      if (pClassYear < 2020 || pClassYear > CURRENT_YEAR) continue;

      const KEY_POS = ["QB", "RB", "WR", "TE"];
      if (!KEY_POS.includes(p.position)) continue;

      prospects.push({
        sleeperId: p.sleeperId as string,
        name: p.name as string,
        position: p.position as string,
        team: (p.maybeTeam as string | null) ?? null,
        age: age,
        classYear: pClassYear,
        college: (raw?.college as string | undefined) ?? null,
        value: (entry.value as number) ?? 0,
        trend: ((entry.trend30Day ?? entry.overallTrend ?? 0) as number),
        redraftValue: (entry.redraftValue as number) ?? 0,
        tier: (entry.maybeTier as number | null) ?? null,
      });
    }

    // Filter and rank
    const filtered = prospects.filter((p) => {
      const yearMatch = classYear === null || p.classYear === classYear;
      const posMatch = position === "ALL" || p.position === position;
      return yearMatch && posMatch;
    });

    filtered.sort((a, b) => b.value - a.value);
    const ranked = filtered.map((p, i) => ({ ...p, rank: i + 1 }));

    return NextResponse.json({ prospects: ranked });
  } catch (e: any) {
    console.error("[scouting/prospects]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
