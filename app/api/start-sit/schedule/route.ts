import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ESPN_TO_SLEEPER: Record<string, string> = { WSH: "WAS" };

const TTL = 12 * 60 * 60 * 1000;

type GameOdds = { total: number | null; spread: number | null; isFavorite: boolean };

const cache: Record<string, {
  schedule: Record<string, string>;
  odds: Record<string, GameOdds>;
  expiry: number;
}> = {};

// GET /api/start-sit/schedule?week=1&season=2025
// Returns { schedule: { KC: "LAC", ... }, odds: { KC: { total: 44.5, spread: -2.5, isFavorite: true }, ... } }
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const week   = sp.get("week");
  const season = sp.get("season");

  if (!week || !season) {
    return NextResponse.json({ error: "Missing week or season" }, { status: 400 });
  }

  const key = `${season}_${week}`;
  if (cache[key] && Date.now() < cache[key].expiry) {
    return NextResponse.json({ schedule: cache[key].schedule, odds: cache[key].odds });
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`ESPN schedule ${res.status}`);

    const data = await res.json();
    const schedule: Record<string, string> = {};
    const odds: Record<string, GameOdds>   = {};

    for (const event of data.events ?? []) {
      const comp        = event.competitions?.[0];
      const competitors = comp?.competitors ?? [];
      const espnOdds    = comp?.odds?.[0];

      const teams: { abbr: string; homeAway: string }[] = competitors.map(
        (c: { team: { abbreviation: string }; homeAway: string }) => ({
          abbr:    ESPN_TO_SLEEPER[c.team.abbreviation] ?? c.team.abbreviation,
          homeAway: c.homeAway,
        })
      );

      if (teams.length === 2) {
        schedule[teams[0].abbr] = teams[1].abbr;
        schedule[teams[1].abbr] = teams[0].abbr;

        if (espnOdds) {
          const total  = espnOdds.overUnder ?? null;
          const rawSpread: number | null = espnOdds.spread ?? null; // negative = home team favored
          // homeTeamOdds.favorite tells us which team is the favorite
          const homeIsFav = espnOdds.homeTeamOdds?.favorite === true;
          const homeTeam  = teams.find((t) => t.homeAway === "home")?.abbr;
          const awayTeam  = teams.find((t) => t.homeAway === "away")?.abbr;

          if (homeTeam) {
            odds[homeTeam] = {
              total,
              spread: rawSpread,             // negative = this team favored
              isFavorite: homeIsFav,
            };
          }
          if (awayTeam) {
            odds[awayTeam] = {
              total,
              spread: rawSpread !== null ? -rawSpread : null, // flip for away
              isFavorite: !homeIsFav,
            };
          }
        }
      }
    }

    cache[key] = { schedule, odds, expiry: Date.now() + TTL };
    return NextResponse.json({ schedule, odds });
  } catch (e: unknown) {
    if (cache[key]) return NextResponse.json({ schedule: cache[key].schedule, odds: cache[key].odds, stale: true });
    return NextResponse.json({ schedule: {}, odds: {} });
  }
}
