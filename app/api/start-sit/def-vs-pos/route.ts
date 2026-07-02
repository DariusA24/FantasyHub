import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

const ESPN_TO_SLEEPER: Record<string, string> = { WSH: "WAS" };
const SLEEPER_TO_ESPN: Record<string, string> = { WAS: "WSH" };

const TTL = 6 * 60 * 60 * 1000; // 6h

const cache: Record<string, { avgPts: number | null; gamesPlayed: number; expiry: number }> = {};

async function getMatchups(season: number, week: number): Promise<{ home: string; away: string }[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.events ?? []).flatMap((g: any) => {
    const abbrs = (g.competitions?.[0]?.competitors ?? []).map(
      (c: any) => ESPN_TO_SLEEPER[c.team?.abbreviation] ?? c.team?.abbreviation
    );
    return abbrs.length === 2 ? [{ home: abbrs[0], away: abbrs[1] }] : [];
  });
}

async function getWeekStats(season: number, week: number): Promise<Record<string, number>> {
  const r = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`,
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!r.ok) return {};
  const raw = await r.json() as Record<string, any>;
  // Map playerId → pts_ppr
  const out: Record<string, number> = {};
  for (const [id, entry] of Object.entries(raw)) {
    const pts = Number(entry?.pts_ppr ?? 0);
    if (pts > 0) out[id] = pts;
  }
  return out;
}

// GET /api/start-sit/def-vs-pos?team=KC&pos=WR&season=2025
// Returns { avgPts, gamesPlayed } — avg PPR pts the DEFENSE allows to POS per game
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const team   = sp.get("team");   // opponent's Sleeper team abbr
  const pos    = sp.get("pos");    // WR | RB | QB | TE
  const season = parseInt(sp.get("season") ?? "2025");

  if (!team || !pos) {
    return NextResponse.json({ error: "Missing team or pos" }, { status: 400 });
  }

  const key = `${season}_${pos}_${team}`;
  const hit = cache[key];
  if (hit && Date.now() < hit.expiry) {
    return NextResponse.json({ avgPts: hit.avgPts, gamesPlayed: hit.gamesPlayed });
  }

  try {
    // All players of this position, keyed by team
    const posPlayers = await prisma.sleeperPlayer.findMany({
      where: { position: pos, team: { not: null } },
      select: { id: true, team: true },
    });

    const teamToIds: Record<string, string[]> = {};
    for (const p of posPlayers) {
      if (!p.team) continue;
      (teamToIds[p.team] ??= []).push(p.id);
    }

    const espnTeam = SLEEPER_TO_ESPN[team] ?? team;

    // Fetch all 17 regular-season weeks in parallel
    const weeks = Array.from({ length: 17 }, (_, i) => i + 1);
    const weekData = await Promise.all(
      weeks.map(async (w) => {
        const [matchups, stats] = await Promise.all([
          getMatchups(season, w),
          getWeekStats(season, w),
        ]);

        const matchup = matchups.find(
          (m) =>
            (ESPN_TO_SLEEPER[m.home] ?? m.home) === team ||
            (ESPN_TO_SLEEPER[m.away] ?? m.away) === team
        );
        if (!matchup) return null; // bye week

        const espnOpp = matchup.home === espnTeam ? matchup.away : matchup.home;
        const sleeperOpp = ESPN_TO_SLEEPER[espnOpp] ?? espnOpp;

        const playerIds = teamToIds[sleeperOpp] ?? [];
        const pts = playerIds.reduce((sum, id) => sum + (stats[id] ?? 0), 0);
        return pts;
      })
    );

    const played = weekData.filter((v) => v !== null) as number[];
    const avgPts =
      played.length > 0
        ? Math.round((played.reduce((a, b) => a + b, 0) / played.length) * 10) / 10
        : null;

    cache[key] = { avgPts, gamesPlayed: played.length, expiry: Date.now() + TTL };
    return NextResponse.json({ avgPts, gamesPlayed: played.length });
  } catch (e: any) {
    console.error("[def-vs-pos]", e);
    if (cache[key]) return NextResponse.json({ avgPts: cache[key].avgPts, gamesPlayed: cache[key].gamesPlayed });
    return NextResponse.json({ avgPts: null, gamesPlayed: 0 });
  }
}
