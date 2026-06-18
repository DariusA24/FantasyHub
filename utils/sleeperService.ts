const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';

async function sleeperRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    // You can tweak caching/next options here if needed
    // cache: 'no-store',
    ...init,
  });

  if (!res.ok) {
    // Optionally log more details here
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Get a Sleeper user by username.
 * Docs: https://docs.sleeper.com/#user-get-user-by-username
 */
export async function getSleeperUserByUsername(username: string) {
  if (!username.trim()) throw new Error('Username required');
  return sleeperRequest<any>(`/user/${encodeURIComponent(username.trim())}`);
}

/**
 * Get a Sleeper user by user_id.
 * Docs: https://docs.sleeper.com/#user-get-user
 */
export async function getSleeperUserById(userId: string) {
  if (!userId.trim()) throw new Error('User ID required');
  return sleeperRequest<any>(`/user/${encodeURIComponent(userId.trim())}`);
}

// Example: you can grow this service over time:
//
export async function getUserLeagues(userId: string, sport: string, season: string) {
  return sleeperRequest<any[]>(`/user/${encodeURIComponent(userId)}/leagues/${sport}/${season}`);
}

export async function getLeague(leagueId: string) {
  return sleeperRequest<any>(`/league/${encodeURIComponent(leagueId)}`);
}

export async function getLeagueRosters(leagueId: string) {
  return sleeperRequest<any[]>(`/league/${encodeURIComponent(leagueId)}/rosters`);
}

export async function getAllNflPlayers(): Promise<Record<string, any>> {
  // Cache for 24 hours — player metadata (name, position, team) rarely changes mid-day
  const res = await fetch(`${SLEEPER_BASE_URL}/players/nfl`, {
    next: { revalidate: 86400 },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
