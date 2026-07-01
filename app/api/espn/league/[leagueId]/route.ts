import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ESPN_BASE = "https://fantasy.espn.com/apis/v3/games/ffl";

// Proxy ESPN public league data. Query params: season, week (optional)
// Returns: { settings, teams, schedule (current week matchups) }
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await params;
  const sp     = req.nextUrl.searchParams;
  const season = sp.get("season") ?? new Date().getFullYear().toString();
  const week   = sp.get("week");

  const views = ["mSettings", "mTeam", "mRoster"];
  if (week) views.push("mMatchup");

  const viewStr = views.map((v) => `view=${v}`).join("&");
  const weekStr = week ? `&scoringPeriodId=${week}` : "";
  const url     = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?${viewStr}${weekStr}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: "This league is private." }, { status: 403 });
    }
    if (res.status === 404) {
      return NextResponse.json({ error: "League not found." }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "ESPN API error." }, { status: 502 });
    }

    const raw = await res.json();

    // Shape the response into something clean
    const settings = {
      name: raw.settings?.name ?? "ESPN League",
      size: raw.settings?.size ?? 0,
      scoringType: raw.settings?.scoringSettings?.scoringType ?? "standard",
      playoffTeams: raw.settings?.scheduleSettings?.playoffTeamCount ?? 0,
    };

    const teams: EspnTeam[] = (raw.teams ?? []).map((t: any) => ({
      id: t.id,
      abbrev: t.abbrev,
      name: `${t.location ?? ""} ${t.nickname ?? ""}`.trim(),
      logo: t.logo ?? null,
      wins: t.record?.overall?.wins ?? 0,
      losses: t.record?.overall?.losses ?? 0,
      ties: t.record?.overall?.ties ?? 0,
      pointsFor: t.record?.overall?.pointsFor ?? 0,
      pointsAgainst: t.record?.overall?.pointsAgainst ?? 0,
      playoffSeed: t.playoffSeed ?? null,
      roster: (t.roster?.entries ?? []).map((e: any) => ({
        playerId: e.playerId,
        fullName: e.playerPoolEntry?.playerPoolEntry?.player?.fullName
          ?? e.playerPoolEntry?.player?.fullName
          ?? "Unknown",
        defaultPosition: e.playerPoolEntry?.playerPoolEntry?.player?.defaultPositionId
          ?? e.playerPoolEntry?.player?.defaultPositionId
          ?? null,
        injuryStatus: e.playerPoolEntry?.playerPoolEntry?.injuryStatus
          ?? e.playerPoolEntry?.injuryStatus
          ?? null,
        lineupSlotId: e.lineupSlotId,
      })),
    }));

    // Sort by wins desc, then points for
    const standings = [...teams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    });

    // Current week matchups
    const matchups = week
      ? (raw.schedule ?? [])
          .filter((m: any) => m.matchupPeriodId === parseInt(week))
          .map((m: any) => ({
            home: { teamId: m.home?.teamId, totalPoints: m.home?.totalPoints ?? 0 },
            away: { teamId: m.away?.teamId, totalPoints: m.away?.totalPoints ?? 0 },
            winner: m.winner ?? null,
          }))
      : [];

    return NextResponse.json({ settings, teams, standings, matchups });
  } catch {
    return NextResponse.json({ error: "Failed to reach ESPN." }, { status: 502 });
  }
}

type EspnTeam = {
  id: number;
  abbrev: string;
  name: string;
  logo: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffSeed: number | null;
  roster: { playerId: number; fullName: string; defaultPosition: number | null; injuryStatus: string | null; lineupSlotId: number }[];
};
