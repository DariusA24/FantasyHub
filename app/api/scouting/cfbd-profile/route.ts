import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CFBD_KEY = process.env.CFBD_API_KEY ?? "";
const CFBD_BASE = "https://api.collegefootballdata.com";

const cache: Record<string, { data: any; expiry: number }> = {};
const CACHE_TTL = 6 * 60 * 60 * 1000;

async function cfbdGet(path: string): Promise<any> {
  const now = Date.now();
  if (cache[path] && now < cache[path].expiry) return cache[path].data;

  const res = await fetch(`${CFBD_BASE}${path}`, {
    headers: { Authorization: `Bearer ${CFBD_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`CFBD ${path}: ${res.status}`);
  const data = await res.json();
  cache[path] = { data, expiry: now + CACHE_TTL };
  return data;
}

// Pivot flat stat rows [{category, statType, stat}] into {category: {statType: value}}
type StatsByCategory = Record<string, Record<string, number>>;

function pivotStats(rows: any[], athleteId: string): StatsByCategory {
  const result: StatsByCategory = {};
  const OFFENSIVE = new Set(["passing", "rushing", "receiving"]);
  for (const row of rows) {
    if (String(row.playerId) !== String(athleteId)) continue;
    const cat = (row.category as string).toLowerCase();
    if (!OFFENSIVE.has(cat)) continue;
    if (!result[cat]) result[cat] = {};
    result[cat][(row.statType as string).toLowerCase()] = Number(row.stat);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const athleteId = sp.get("athleteId");
  const name = sp.get("name") ?? "";
  const recruitYear = parseInt(sp.get("recruitYear") ?? "2023");

  if (!athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 });
  }

  try {
    // 1. Player search → current team + school colors
    const searchResults: any[] = await cfbdGet(
      `/player/search?searchTerm=${encodeURIComponent(name)}`
    );
    const playerInfo =
      searchResults.find((p) => String(p.id) === String(athleteId)) ??
      searchResults[0] ??
      null;

    const currentTeam: string | null = playerInfo?.team ?? null;

    if (!currentTeam) {
      return NextResponse.json({
        playerInfo: null,
        roster: null,
        statsByYear: {},
        currentTeam: null,
      });
    }

    // 2. Determine completed seasons to fetch
    // recruitYear = year they enrolled in college; first season = that year
    const completedSeasons: number[] = [];
    for (let y = recruitYear; y <= 2025; y++) completedSeasons.push(y);
    // Cap at 3 most recent seasons
    const seasons = completedSeasons.slice(-3);

    // 3. Fetch stats for each season + roster in parallel
    const [seasonStatArrays, rosterRows] = await Promise.all([
      Promise.all(
        seasons.map((year) =>
          cfbdGet(
            `/stats/player/season?year=${year}&team=${encodeURIComponent(currentTeam)}`
          ).catch(() => [])
        )
      ),
      cfbdGet(
        `/roster?team=${encodeURIComponent(currentTeam)}&year=2025`
      ).catch(() => []),
    ]);

    // 4. Pivot stats per season
    const statsByYear: Record<number, StatsByCategory> = {};
    seasons.forEach((year, i) => {
      const pivoted = pivotStats(seasonStatArrays[i] ?? [], athleteId);
      if (Object.keys(pivoted).length > 0) statsByYear[year] = pivoted;
    });

    // 5. Find roster entry
    const rosterEntry = (rosterRows as any[]).find(
      (p) => String(p.id) === String(athleteId)
    ) ?? null;

    return NextResponse.json({
      playerInfo: {
        team: currentTeam,
        teamColor: playerInfo.teamColor ?? null,
        teamColorSecondary: playerInfo.teamColorSecondary ?? null,
        jersey: playerInfo.jersey ?? rosterEntry?.jersey ?? null,
      },
      roster: rosterEntry
        ? {
            year: rosterEntry.year ?? null,
            jersey: rosterEntry.jersey ?? null,
            homeCity: rosterEntry.homeCity ?? null,
            homeState: rosterEntry.homeState ?? null,
          }
        : null,
      statsByYear,
      currentTeam,
    });
  } catch (e: any) {
    console.error("[cfbd-profile]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
