import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeaturedPlayer = {
  sleeperId: string;
  name: string;
  position: string;
  team: string;
  projectedPts: number;
  age: number | null;
  opponent: string | null;
};

// ─── Pool cache (per week+season+ppr, rebuilt after TTL) ─────────────────────

const POOL_TTL = 4 * 60 * 60 * 1000; // 4 h
type Pool = { pairs: [FeaturedPlayer, FeaturedPlayer][]; expiry: number };
const poolCache: Record<string, Pool> = {};

// ─── NFL schedule → team opponent map (ESPN public API) ──────────────────────

async function fetchOpponentMap(season: string, week: number): Promise<Record<string, string>> {
  try {
    // seasontype=2 = regular season; dates=year selects the NFL season
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${season}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return {};
    const data = await res.json();
    const events: unknown[] = data?.events ?? [];
    const map: Record<string, string> = {};
    for (const event of events) {
      const comp = (event as any)?.competitions?.[0];
      const competitors: Array<{ team: { abbreviation: string }; homeAway: string }> =
        comp?.competitors ?? [];
      if (competitors.length < 2) continue;
      const home = competitors.find((c) => c.homeAway === "home")?.team.abbreviation;
      const away = competitors.find((c) => c.homeAway === "away")?.team.abbreviation;
      if (home && away) {
        map[home] = `vs ${away}`;
        map[away] = `@ ${home}`;
      }
    }
    return map;
  } catch {
    return {};
  }
}

// ─── Build candidate pool ─────────────────────────────────────────────────────

const POSITIONS    = ["QB", "RB", "WR", "TE"] as const;
const SKIP_TOP     = 2;    // skip obvious must-starts at the very top
const PER_POSITION = 25;   // how many players per position to consider
const MAX_GAP      = 3.5;  // max pts gap between the pair to be "same tier"
const TARGET_PAIRS = 12;   // target pool size across all positions

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function buildPool(
  season: string,
  week: number,
  ppr: number,
): Promise<[FeaturedPlayer, FeaturedPlayer][]> {
  const ptsKey = ppr === 1 ? "pts_ppr" : ppr === 0.5 ? "pts_half_ppr" : "pts_std";

  const [projRes, oppMap] = await Promise.all([
    fetch(
      `https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}`,
      { signal: AbortSignal.timeout(10_000) },
    ),
    fetchOpponentMap(season, week),
  ]);
  if (!projRes.ok) throw new Error(`Sleeper projections error: ${projRes.status}`);
  const raw = await projRes.json() as Record<string, Record<string, number>>;

  const projected = Object.entries(raw)
    .map(([id, data]) => ({ id, pts: data[ptsKey] ?? data["pts_ppr"] ?? 0 }))
    .filter((e) => e.pts > 2);

  if (projected.length < 4) throw new Error("Not enough projection data");

  const dbPlayers = await prisma.sleeperPlayer.findMany({
    where: {
      id: { in: projected.map((p) => p.id) },
      position: { in: [...POSITIONS] },
      team: { not: null },
    },
    select: { id: true, full_name: true, position: true, team: true },
  });

  const dbMap = new Map(dbPlayers.map((p) => [p.id, p]));

  const enriched: FeaturedPlayer[] = projected
    .filter((p) => dbMap.has(p.id))
    .map((p) => {
      const db = dbMap.get(p.id)!;
      return {
        sleeperId: p.id,
        name: db.full_name ?? p.id,
        position: db.position!,
        team: db.team!,
        projectedPts: p.pts,
        age: null,
        opponent: db.team ? (oppMap[db.team] ?? null) : null,
      };
    });

  const pairs: [FeaturedPlayer, FeaturedPlayer][] = [];

  for (const pos of POSITIONS) {
    const sorted = enriched
      .filter((p) => p.position === pos)
      .sort((a, b) => b.projectedPts - a.projectedPts)
      .slice(SKIP_TOP, SKIP_TOP + PER_POSITION);

    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i].projectedPts - sorted[i + 1].projectedPts;
      if (gap >= 0 && gap <= MAX_GAP) {
        pairs.push([sorted[i], sorted[i + 1]]);
      }
    }
  }

  if (pairs.length < 2) throw new Error("Not enough close-tier pairs found");

  return shuffle(pairs).slice(0, TARGET_PAIRS);
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function getPool(
  season: string,
  week: number,
  ppr: number,
): Promise<{ pairs: [FeaturedPlayer, FeaturedPlayer][]; isOffseason: boolean }> {
  const now = Date.now();
  const key = `${season}_${week}_${ppr}`;

  if (poolCache[key] && now < poolCache[key].expiry) {
    return { pairs: poolCache[key].pairs, isOffseason: false };
  }

  try {
    const pairs = await buildPool(season, week, ppr);
    poolCache[key] = { pairs, expiry: now + POOL_TTL };
    return { pairs, isOffseason: false };
  } catch (e) {
    console.warn(`[start-sit/featured] week ${week} failed, trying fallbacks:`, e);
  }

  // Off-season fallbacks: week 1 of current season, then prior season
  const fallbacks = week !== 1
    ? [{ s: season, w: 1 }, { s: String(parseInt(season) - 1), w: 1 }]
    : [{ s: String(parseInt(season) - 1), w: 1 }];

  for (const { s, w } of fallbacks) {
    const fbKey = `${s}_${w}_${ppr}`;
    if (poolCache[fbKey] && now < poolCache[fbKey].expiry) {
      return { pairs: poolCache[fbKey].pairs, isOffseason: true };
    }
    try {
      const pairs = await buildPool(s, w, ppr);
      poolCache[fbKey] = { pairs, expiry: now + POOL_TTL };
      return { pairs, isOffseason: true };
    } catch {
      // try next
    }
  }

  throw new Error("All fallbacks exhausted");
}

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const week   = parseInt(sp.get("week") ?? "");
  const season = sp.get("season") ?? "";
  const ppr    = parseFloat(sp.get("ppr") ?? "1");

  if (!week || !season) {
    return NextResponse.json({ error: "Missing week or season" }, { status: 400 });
  }

  try {
    const { pairs, isOffseason } = await getPool(season, week, ppr);
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    return NextResponse.json({ players: pair, isOffseason });
  } catch (e: any) {
    console.error("[start-sit/featured]", e);
    return NextResponse.json({ error: "No projection data available" }, { status: 404 });
  }
}
