import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.THE_ODDS_API_KEY ?? "";
const BASE    = "https://api.the-odds-api.com/v4/sports/americanfootball_nfl";

// Map Sleeper abbreviations → full team names used by The Odds API
const ABBR_TO_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals",   ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",    BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",   CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",      DEN: "Denver Broncos",
  DET: "Detroit Lions",       GB:  "Green Bay Packers",
  HOU: "Houston Texans",      IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",KC:  "Kansas City Chiefs",
  LV:  "Las Vegas Raiders",   LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",    MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",   NE:  "New England Patriots",
  NO:  "New Orleans Saints",  NYG: "New York Giants",
  NYJ: "New York Jets",       PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers", SF:  "San Francisco 49ers",
  SEA: "Seattle Seahawks",    TB:  "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",    WAS: "Washington Commanders",
};

// Convert decimal odds to American
function toAmerican(decimal: number): string {
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
}

// ── In-memory caches ──────────────────────────────────────────────────────────

type OddsEvent = { id: string; home_team: string; away_team: string; commence_time: string };
let eventListCache: { data: OddsEvent[]; expiry: number } | null = null;

type PropOutcome = { name: string; description?: string; price: number; point?: number };
type PropMarket  = { key: string; outcomes: PropOutcome[] };
type EventProps  = { id: string; bookmakers: { key: string; markets: PropMarket[] }[] };
const propCache: Record<string, { data: EventProps; expiry: number }> = {};

const EVENT_TTL = 6 * 60 * 60 * 1000;  // 6h — event list stable
const PROP_TTL  = 60 * 60 * 1000;       // 1h — props update during week

async function getEvents(): Promise<OddsEvent[]> {
  if (eventListCache && Date.now() < eventListCache.expiry) return eventListCache.data;
  const r = await fetch(`${BASE}/events?apiKey=${API_KEY}`, { signal: AbortSignal.timeout(8_000) });
  if (!r.ok) return eventListCache?.data ?? [];
  const data: OddsEvent[] = await r.json();
  eventListCache = { data, expiry: Date.now() + EVENT_TTL };
  return data;
}

async function getEventProps(eventId: string): Promise<EventProps | null> {
  const hit = propCache[eventId];
  if (hit && Date.now() < hit.expiry) return hit.data;

  const markets = "player_reception_yds,player_rush_yds,player_pass_yds,player_anytime_td";
  const r = await fetch(
    `${BASE}/events/${eventId}/odds?apiKey=${API_KEY}&regions=us&markets=${markets}&bookmakers=draftkings`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!r.ok) return null;
  const data: EventProps = await r.json();
  propCache[eventId] = { data, expiry: Date.now() + PROP_TTL };
  return data;
}

// ── Route ─────────────────────────────────────────────────────────────────────

// GET /api/start-sit/player-props?name=CeeDee+Lamb&team=DAL&pos=WR
// Returns { ydsLine, ydsOver, ydsUnder, anytimeTd } or nulls if not posted
export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams;
  const name = sp.get("name");
  const team = sp.get("team");
  const pos  = sp.get("pos");

  if (!name || !team || !pos) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "THE_ODDS_API_KEY not configured" }, { status: 503 });
  }

  try {
    const teamName = ABBR_TO_NAME[team];
    if (!teamName) return NextResponse.json({ ydsLine: null, ydsOver: null, ydsUnder: null, anytimeTd: null });

    // Find the event for this team
    const events = await getEvents();
    const event  = events.find(
      (e) => e.home_team === teamName || e.away_team === teamName
    );
    if (!event) return NextResponse.json({ ydsLine: null, ydsOver: null, ydsUnder: null, anytimeTd: null });

    // Fetch props for this event
    const eventProps = await getEventProps(event.id);
    const markets = eventProps?.bookmakers?.[0]?.markets ?? [];

    // Determine which yards market to use by position
    const ydsMarketKey =
      pos === "QB" ? "player_pass_yds" :
      pos === "RB" ? "player_rush_yds" :
      "player_reception_yds";

    // Normalize player name for fuzzy matching
    const nameLower = name.toLowerCase().trim();
    const nameMatch = (desc: string | undefined) =>
      (desc ?? "").toLowerCase().trim() === nameLower;

    // Yards over/under
    const ydsMkt = markets.find((m) => m.key === ydsMarketKey);
    const overOutcome  = ydsMkt?.outcomes.find((o) => o.name === "Over"  && nameMatch(o.description));
    const underOutcome = ydsMkt?.outcomes.find((o) => o.name === "Under" && nameMatch(o.description));

    // Anytime TD
    const tdMkt      = markets.find((m) => m.key === "player_anytime_td");
    const tdOutcome  = tdMkt?.outcomes.find((o) => nameMatch(o.description));

    return NextResponse.json({
      ydsLine:   overOutcome?.point  ?? null,
      ydsOver:   overOutcome  ? toAmerican(overOutcome.price)  : null,
      ydsUnder:  underOutcome ? toAmerican(underOutcome.price) : null,
      anytimeTd: tdOutcome    ? toAmerican(tdOutcome.price)    : null,
    });
  } catch (e) {
    console.error("[player-props]", e);
    return NextResponse.json({ ydsLine: null, ydsOver: null, ydsUnder: null, anytimeTd: null });
  }
}
