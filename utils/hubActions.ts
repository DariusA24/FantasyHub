export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
  previous_league_id?: string | null;
};

export type HubLeague = {
  id: string;
  name: string;
  description?: string | null;
  isMember?: boolean;
  ownerUsername?: string | null;
};

// internal: derive owner username from various possible shapes
const getOwnerUsername = (row: any, hub: any) => {
  const membersFromRow = row?.hubLeagueMembers ?? row?.hubLeagueMember;
  if (Array.isArray(membersFromRow)) {
    const ownerMember =
      membersFromRow.find((m: any) => m.role === "OWNER" || m.isOwner) ??
      membersFromRow.find((m: any) => m.is_owner);
    if (ownerMember?.user?.username) return ownerMember.user.username;
  } else if (membersFromRow?.user?.username) {
    return membersFromRow.user.username;
  }
  return hub?.owner?.username ?? hub?.ownerUsername ?? null;
};

export async function fetchHubLeaguesForSleeperLeague(
  sleeperLeagueId: string,
  previousLeagueId?: string | null
): Promise<HubLeague[]> {
  let res: Response;
  try {
    const params = new URLSearchParams({ sleeperLeagueId });
    if (previousLeagueId) params.set('previousLeagueId', previousLeagueId);
    res = await fetch(`/api/hub-leagues?${params.toString()}`);
  } catch (e: any) {
    throw new Error(`Failed to reach /api/hub-leagues: ${e?.message ?? String(e)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json().catch((e: any) => {
    throw new Error(`Invalid JSON from /api/hub-leagues: ${e?.message ?? String(e)}`);
  });

  // TEMP: log response so you can see real shape
  if (typeof window !== 'undefined') {
    console.log('[fetchHubLeaguesForSleeperLeague] raw:', data);
  }

  const hubLeagueSeasons = Array.isArray(data?.hubLeagueSeasons)
    ? data.hubLeagueSeasons
    : Array.isArray(data?.data?.hubLeagueSeasons)
    ? data.data.hubLeagueSeasons
    : Array.isArray(data?.rows)
    ? data.rows
    : [];

  const hubLeagues = Array.isArray(data?.hubLeagues)
    ? data.hubLeagues
    : Array.isArray(data?.data?.hubLeagues)
    ? data.data.hubLeagues
    : Array.isArray(data)
    ? data
    : [];

  let normalized: HubLeague[] = [];

  if (hubLeagueSeasons.length) {
    normalized = hubLeagueSeasons
      .map((row: any) => {
        const hub = row?.hubLeague ?? row?.hub_league ?? row;
        if (!hub?.id || !hub?.name) return null;
        return {
          id: String(hub.id),
          name: hub.name,
          description: hub.description ?? null,
          isMember: hub.isMember ?? hub.is_member ?? false,
          ownerUsername: getOwnerUsername(row, hub),
        } as HubLeague;
      })
      .filter((h: HubLeague | null): h is HubLeague => !!h);
  } else if (hubLeagues.length) {
    normalized = hubLeagues
      .map((hub: any) => {
        const obj = hub?.hubLeague ?? hub?.hub_league ?? hub;
        if (!obj?.id || !obj?.name) return null;
        return {
          id: String(obj.id),
          name: obj.name,
          description: obj.description ?? null,
          isMember: obj.isMember ?? obj.is_member ?? false,
          ownerUsername: getOwnerUsername(null, obj),
        } as HubLeague;
      })
      .filter((h: HubLeague | null): h is HubLeague => !!h);
  }

  return normalized;
}

export async function createHubLeagueForSleeperLeague(
  league: SleeperLeague
): Promise<HubLeague> {
  let res: Response;
  try {
    res = await fetch("/api/hub-leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sleeperLeagueId: league.league_id,
        sleeperName: league.name,
        sleeperSport: league.sport,
        season: league.season,
        name: league.name,
        description: `Hub league for Sleeper league ${league.name} (${league.season})`,
        previousLeagueId: league.previous_league_id ?? null,
      }),
    });
  } catch (e: any) {
    throw new Error(`Failed to reach /api/hub-leagues (POST): ${e?.message ?? String(e)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json().catch((e: any) => {
    throw new Error(`Invalid JSON from /api/hub-leagues (POST): ${e?.message ?? String(e)}`);
  });

  const created: HubLeague | undefined =
    data?.hubLeague ?? data?.hub_league ?? data?.data?.hubLeague ?? data?.data?.hub_league;

  if (!created) {
    throw new Error("API did not return 'hubLeague' in response");
  }

  return created;
}

export async function linkSeasonToHubLeague(
  hubLeagueId: string,
  league: SleeperLeague
): Promise<HubLeague> {
  let res: Response;
  try {
    res = await fetch("/api/hub-leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hubLeagueId,
        sleeperLeagueId: league.league_id,
        sleeperName: league.name,
        sleeperSport: league.sport,
        season: league.season,
        name: league.name,
      }),
    });
  } catch (e: any) {
    throw new Error(`Failed to reach /api/hub-leagues (POST): ${e?.message ?? String(e)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json().catch((e: any) => {
    throw new Error(`Invalid JSON from /api/hub-leagues (POST): ${e?.message ?? String(e)}`);
  });

  const updated: HubLeague | undefined =
    data?.hubLeague ?? data?.hub_league ?? data?.data?.hubLeague;

  if (!updated) {
    throw new Error("API did not return 'hubLeague' in response");
  }

  return updated;
}

export async function joinHubLeague(hubLeagueId: string): Promise<void> {
  // If your route folder is /app/hub-leagues/[hubLeagueId]/join/route.ts
  // then the URL should match that param name, not [id].
  const res = await fetch(`/api/hub-leagues/${hubLeagueId}/join`, {
    method: "POST",
  });

  if (res.status === 401) {
    throw new Error("You must be signed in to join this hub league.");
  }

  if (!res.ok) {
    throw new Error((await res.text()) || "Failed to join hub league.");
  }
}
