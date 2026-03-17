export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
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

  const membersFromHub = hub?.hubLeagueMembers ?? hub?.hubLeagueMember;
  if (Array.isArray(membersFromHub)) {
    const ownerMember =
      membersFromHub.find((m: any) => m.role === "OWNER" || m.isOwner) ??
      membersFromHub.find((m: any) => m.is_owner);
    if (ownerMember?.user?.username) return ownerMember.user.username;
  } else if (membersFromHub?.user?.username) {
    return membersFromHub.user.username;
  }

  return hub?.owner?.username ?? hub?.ownerUsername ?? null;
};

export async function fetchHubLeaguesForSleeperLeague(
  sleeperLeagueId: string
): Promise<HubLeague[]> {
  const res = await fetch(
    `/api/hub-leagues?sleeperLeagueId=${encodeURIComponent(sleeperLeagueId)}`
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();

  let normalized: HubLeague[] = [];
  if (Array.isArray(data.hubLeagueSeasons)) {
    normalized = data.hubLeagueSeasons
      .map((row: any) => {
        const hub = row?.hubLeague;
        if (!hub) return null;
        return {
          id: String(hub.id),
          name: hub.name,
          description: hub.description ?? null,
          isMember: !!hub.isMember,
          ownerUsername: getOwnerUsername(row, hub),
        } as HubLeague;
      })
      .filter((h: HubLeague | null): h is HubLeague => !!h);
  } else if (Array.isArray(data.hubLeagues)) {
    normalized = data.hubLeagues.map((hub: any) => ({
      id: String(hub.id),
      name: hub.name,
      description: hub.description ?? null,
      isMember: !!hub.isMember,
      ownerUsername: getOwnerUsername(null, hub),
    }));
  }

  return normalized;
}

export async function createHubLeagueForSleeperLeague(
  league: SleeperLeague
): Promise<HubLeague> {
  const res = await fetch("/api/hub-leagues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sleeperLeagueId: league.league_id,
      sleeperName: league.name,
      sleeperSport: league.sport,
      season: league.season,
      name: league.name,
      description: `Hub league for Sleeper league ${league.name} (${league.season})`,
    }),
  });

  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const created: HubLeague | undefined = data.hubLeague;
  if (!created) {
    throw new Error("API did not return 'hubLeague' in response");
  }
  return created;
}

export async function joinHubLeague(hubId: string): Promise<void> {
  const res = await fetch(`/api/hub-leagues/${hubId}/join`, {
    method: "POST",
  });

  if (res.status === 401) {
    throw new Error("You must be signed in to join this hub league.");
  }

  if (!res.ok) {
    throw new Error((await res.text()) || "Failed to join hub league.");
  }
}
