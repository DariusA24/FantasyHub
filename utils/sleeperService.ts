const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';

// Revalidation windows (seconds)
const TTL = {
  user: 3600,       // 1 hour — display names rarely change
  leagues: 3600,    // 1 hour — league membership doesn't change mid-season
  rosters: 1800,    // 30 min — W-L records update after each game week
  players: 86400,   // 24 hours — player metadata (name/position/team)
} as const;

async function sleeperRequest<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    next: { revalidate },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getSleeperUserByUsername(username: string) {
  if (!username.trim()) throw new Error('Username required');
  return sleeperRequest<any>(`/user/${encodeURIComponent(username.trim())}`, TTL.user);
}

export async function getSleeperUserById(userId: string) {
  if (!userId.trim()) throw new Error('User ID required');
  return sleeperRequest<any>(`/user/${encodeURIComponent(userId.trim())}`, TTL.user);
}

export async function getUserLeagues(userId: string, sport: string, season: string) {
  return sleeperRequest<any[]>(
    `/user/${encodeURIComponent(userId)}/leagues/${sport}/${season}`,
    TTL.leagues
  );
}

export async function getLeague(leagueId: string) {
  return sleeperRequest<any>(`/league/${encodeURIComponent(leagueId)}`, TTL.rosters);
}

export async function getLeagueRosters(leagueId: string) {
  return sleeperRequest<any[]>(`/league/${encodeURIComponent(leagueId)}/rosters`, TTL.rosters);
}

export async function getLeagueMatchups(leagueId: string, week: number) {
  return sleeperRequest<any[]>(
    `/league/${encodeURIComponent(leagueId)}/matchups/${week}`,
    TTL.rosters
  );
}

export async function getLeagueUsers(leagueId: string) {
  return sleeperRequest<any[]>(`/league/${encodeURIComponent(leagueId)}/users`, TTL.rosters);
}

export async function getAllNflPlayers(): Promise<Record<string, any>> {
  return sleeperRequest<Record<string, any>>('/players/nfl', TTL.players);
}

export async function getLeagueDrafts(leagueId: string) {
  return sleeperRequest<any[]>(`/league/${encodeURIComponent(leagueId)}/drafts`, TTL.leagues);
}

export async function getDraftPicks(draftId: string) {
  return sleeperRequest<any[]>(`/draft/${encodeURIComponent(draftId)}/picks`, TTL.players);
}

export async function getLeagueWinnersBracket(leagueId: string) {
  return sleeperRequest<any[]>(
    `/league/${encodeURIComponent(leagueId)}/winners_bracket`,
    TTL.leagues
  );
}
