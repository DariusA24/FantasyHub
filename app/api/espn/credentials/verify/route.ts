import { NextRequest, NextResponse } from "next/server";
import { extractLeagueIdsFromResponse, DISCOVERY_SEASONS } from "../../_discover";

export const dynamic = "force-dynamic";

const ESPN_BASES = [
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl",
  "https://fantasy.espn.com/apis/v3/games/ffl",
];

const ESPN_HEADERS = (cookieHeader: string) => ({
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://fantasy.espn.com/",
  Origin: "https://fantasy.espn.com",
  Cookie: cookieHeader,
});

async function espnGet(url: string, cookieHeader: string) {
  try {
    const res = await fetch(url, {
      headers: ESPN_HEADERS(cookieHeader),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const t = text.trimStart();
    if (!t.startsWith("{") && !t.startsWith("[")) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractDisplayName(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const ui = d.userInfo as Record<string, unknown> | undefined;
  const accounts = ui?.accounts as Record<string, unknown>[] | undefined;
  const identity = ui?.identity as Record<string, unknown> | undefined;
  return (
    (accounts?.[0]?.displayName as string | undefined) ??
    (accounts?.[0]?.name as string | undefined) ??
    (identity?.displayName as string | undefined) ??
    (identity?.firstName
      ? `${identity.firstName}${identity.lastName ? ` ${identity.lastName}` : ""}`
      : null) ??
    (d.displayName as string | undefined) ??
    null
  );
}

// POST — verify ESPN cookies without saving to DB
export async function POST(req: NextRequest) {
  const { swid, espnS2 } = await req.json();
  if (!swid?.trim() || !espnS2?.trim()) {
    return NextResponse.json({ error: "Both SWID and espn_s2 are required" }, { status: 400 });
  }

  const cookieHeader = `SWID=${swid.trim()}; espn_s2=${espnS2.trim()}`;

  // Probe all seasons in parallel using both URL patterns
  const urlsForSeason = (season: string) => [
    ...ESPN_BASES.map((b) => `${b}/seasons/${season}?view=mUserInfo`),
    ...ESPN_BASES.map((b) => `${b}/seasons/${season}/segments/0/leagues/0?view=mUserInfo`),
  ];

  type ProbeResult = { season: string; data: unknown; leagueIds: string[] };
  const probeResults = await Promise.allSettled(
    DISCOVERY_SEASONS.map(async (season): Promise<ProbeResult> => {
      for (const url of urlsForSeason(season)) {
        const data = await espnGet(url, cookieHeader);
        if (!data) continue;
        const ids = extractLeagueIdsFromResponse(data);
        return { season, data, leagueIds: ids };
      }
      return { season, data: null, leagueIds: [] };
    }),
  );

  // Check that at least one ESPN call succeeded (non-null data = cookies accepted)
  const anySuccess = probeResults.some(
    (r) => r.status === "fulfilled" && r.value.data !== null,
  );
  if (!anySuccess) {
    return NextResponse.json(
      { error: "ESPN did not accept these cookies — double-check SWID and espn_s2" },
      { status: 401 },
    );
  }

  // Extract display name from whichever response had it
  let displayName: string | null = null;
  for (const r of probeResults) {
    if (r.status === "fulfilled" && r.value.data) {
      displayName = extractDisplayName(r.value.data);
      if (displayName) break;
    }
  }

  // Collect all discovered leagues
  type LeaguePreview = { leagueId: string; season: string; name: string | null };
  const leaguesMap = new Map<string, LeaguePreview>();

  for (const r of probeResults) {
    if (r.status !== "fulfilled") continue;
    const { season, leagueIds } = r.value;
    for (const id of leagueIds) {
      const key = `${id}-${season}`;
      if (!leaguesMap.has(key)) {
        leaguesMap.set(key, { leagueId: id, season, name: null });
      }
    }
  }

  // Format SWID for display: strip braces, show first 8 chars + …
  const swidRaw = swid.trim().replace(/^\{|\}$/g, "");
  const swidPreview = `{${swidRaw.slice(0, 8)}…}`;

  const leagues = Array.from(leaguesMap.values());

  return NextResponse.json({
    displayName,
    swidPreview,
    leagues,
    leagueCount: leagues.length,
    seasonsScanned: DISCOVERY_SEASONS,
  });
}
