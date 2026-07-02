// Shared ESPN league-discovery logic (underscore prefix = not a route)
const ESPN_BASES = [
  'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl',
  'https://fantasy.espn.com/apis/v3/games/ffl',
];

const ESPN_HEADERS = (cookieHeader: string) => ({
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://fantasy.espn.com/',
  Origin: 'https://fantasy.espn.com',
  Cookie: cookieHeader,
});

async function espnGet(url: string, cookieHeader: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: ESPN_HEADERS(cookieHeader),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const t = text.trimStart();
    if (!t.startsWith('{') && !t.startsWith('[')) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractLeagueIdsFromResponse(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;

  // Try every known location ESPN has returned league memberships
  const candidates: unknown[] = [];

  const ui = d.userInfo as Record<string, unknown> | undefined;
  if (Array.isArray(ui?.teams))       candidates.push(...(ui!.teams as unknown[]));
  if (Array.isArray(ui?.leagues))     candidates.push(...(ui!.leagues as unknown[]));
  if (Array.isArray(d.teams))         candidates.push(...(d.teams as unknown[]));
  if (Array.isArray(d.leagues))       candidates.push(...(d.leagues as unknown[]));
  if (Array.isArray(data))            candidates.push(...(data as unknown[]));

  return candidates
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => c.leagueId ?? c.id)
    .filter(Boolean)
    .map(String);
}

export type DiscoveredLeague = {
  leagueId: string;
  season: string;
  name: string | null;
  teamCount: number | null;
};

// DEFAULT_SEASONS covers the typical ESPN fantasy football era.
// All seasons are checked in parallel so adding more has minimal latency cost.
export const DISCOVERY_SEASONS = [
  '2026','2025','2024','2023','2022','2021','2020','2019',
];

export async function discoverEspnLeagues(
  swid: string,
  espnS2: string,
  seasons: string[] = DISCOVERY_SEASONS,
): Promise<DiscoveredLeague[]> {
  const cookieHeader = `SWID=${swid}; espn_s2=${espnS2}`;

  // For each season try two URL patterns — ESPN is inconsistent about which works
  const urlsForSeason = (season: string) => [
    ...ESPN_BASES.map((b) => `${b}/seasons/${season}?view=mUserInfo`),
    ...ESPN_BASES.map((b) => `${b}/seasons/${season}/segments/0/leagues/0?view=mUserInfo`),
  ];

  // 1. Discover league IDs across all seasons in parallel
  const discoveryResults = await Promise.allSettled(
    seasons.map(async (season) => {
      for (const url of urlsForSeason(season)) {
        const data = await espnGet(url, cookieHeader);
        if (!data) continue;
        const ids = extractLeagueIdsFromResponse(data);
        if (ids.length > 0) return { season, leagueIds: ids };
      }
      return { season, leagueIds: [] as string[] };
    }),
  );

  const pairs: { season: string; leagueId: string }[] = [];
  for (const r of discoveryResults) {
    if (r.status === 'fulfilled' && r.value) {
      for (const id of r.value.leagueIds) {
        pairs.push({ season: r.value.season, leagueId: id });
      }
    }
  }

  if (pairs.length === 0) return [];

  // 2. Fetch name + team count for each discovered league in parallel
  const nameResults = await Promise.allSettled(
    pairs.map(async ({ season, leagueId }) => {
      for (const base of ESPN_BASES) {
        const data = await espnGet(
          `${base}/seasons/${season}/segments/0/leagues/${leagueId}?view=mSettings`,
          cookieHeader,
        );
        if (!data) continue;
        const d = data as Record<string, unknown>;
        const settings = d?.settings as Record<string, unknown> | undefined;
        return {
          leagueId,
          season,
          name: (settings?.name as string | undefined) ?? null,
          teamCount: (settings?.size as number | undefined) ?? null,
        };
      }
      return { leagueId, season, name: null, teamCount: null };
    }),
  );

  return nameResults
    .filter((r): r is PromiseFulfilledResult<DiscoveredLeague> => r.status === 'fulfilled')
    .map((r) => r.value);
}
