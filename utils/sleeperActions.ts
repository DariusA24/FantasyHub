'use server';

import { getAuthUser } from './actions';
import { prisma } from './db';
import { getSleeperUserByUsername, getSleeperUserById, getUserLeagues, getLeague, getLeagueRosters, getAllNflPlayers } from './sleeperService';

export async function searchSleeperProfile(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('Query required');
  }

  const isUserId = /^[0-9a-fA-F-]{36}$/.test(trimmed);

  try {
    if (isUserId) {
      return await getSleeperUserById(trimmed);
    }
    return await getSleeperUserByUsername(trimmed);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Could not find Sleeper profile. Please check the username/ID.'
    );
  }
}

export async function linkSleeperProfileToUser(sleeperProfile: any) {
  if (!sleeperProfile || !sleeperProfile.user_id) {
    throw new Error('Invalid Sleeper profile data');
  }

  try {
    const user = await getAuthUser();
    console.log('Linking Sleeper profile to user:', sleeperProfile);

    const updatedProfile = await prisma.profile.update({
      where: { clerkId: user.id },
      data: {
        sleeperProfileId: sleeperProfile.user_id,
      },
    });

    console.log('Linked Sleeper profile:', sleeperProfile.user_id);
    return updatedProfile;
  } catch (error) {
    console.error('Error linking Sleeper profile:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to link Sleeper profile.'
    );
  }
}

export async function unlinkSleeperProfileFromUser() {
  try {
    const user = await getAuthUser();
    console.log('Unlinking Sleeper profile from user:', user.id);

    const updatedProfile = await prisma.profile.update({
      where: { clerkId: user.id },
      data: {
        sleeperProfileId: null,
      },
    });

    console.log('Unlinked Sleeper profile for user:', user.id);
    return updatedProfile;
  } catch (error) {
    console.error('Error unlinking Sleeper profile:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to unlink Sleeper profile.'
    );
  }
}

export async function getLinkedSleeperProfileForUser() {
  try {
    const user = await getAuthUser();
    console.log('Fetching linked Sleeper profile for user:', user.id);

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
    });

    if (!profile?.sleeperProfileId) {
      console.log('No linked Sleeper profile found for user:', user.id);
      return null;
    }

    const sleeperProfile = await getSleeperUserById(
      profile.sleeperProfileId
    );

    console.log(
      'Fetched linked Sleeper profile:',
      sleeperProfile,
      'for user:',
      user.id
    );
    return sleeperProfile;
  } catch (error) {
    console.error('Error fetching linked Sleeper profile:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to fetch linked Sleeper profile.'
    );
  }
}

export async function getSleeperLeagues(sleeperProfileId: string, year: string) {
  try {
    const leagues = await getUserLeagues(sleeperProfileId, 'nfl', year);

    console.log(
      `Fetched ${leagues.length} leagues for Sleeper profile ID:`,
      sleeperProfileId
    );
    return leagues;
  } catch (error) {
    console.error('Error fetching Sleeper leagues:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to fetch Sleeper leagues.'
    );
  }
}

export async function getSleeperLeagueAvatarThumbnail(photo: string): Promise<string | null> {
  try {
    if (!photo) return null;

    const avatarUrl = `https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(photo)}`;

    const res = await fetch(avatarUrl, { cache: 'force-cache' });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      console.error('Sleeper avatar fetch failed:', res.status, res.statusText);
      return null;
    }

    return res.url || avatarUrl;
  } catch (error) {
    console.error('Error fetching Sleeper league avatar thumbnail:', error);
    return null;
  }
}

export async function getSleeperLeagueSettings(leagueId: string) {
  try {
    return await getLeague(leagueId);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch Sleeper league settings.'
    );
  }
}

export async function getSleeperLeagueRosters(leagueId: string) {
  try {
    const rosters = await getLeagueRosters(leagueId);
    console.log(
      `Fetched ${rosters.length} rosters for Sleeper league ID:`,
      leagueId
    );
    return rosters;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to fetch Sleeper league rosters.'
    );
  }
}

// Get a specific user's record (wins/losses/ties) for a given league
export async function getSleeperUserRecordForLeague(
  leagueId: string,
  sleeperProfileId: string
): Promise<{ wins: number; losses: number; ties: number }> {
  try {
    const rosters = await getSleeperLeagueRosters(leagueId);

    const myRoster = Array.isArray(rosters)
      ? rosters.find((r: any) => r.owner_id === sleeperProfileId)
      : null;

    if (!myRoster) {
      return { wins: 0, losses: 0, ties: 0 };
    }

    // Sleeper roster objects usually have these fields if the season is in progress
    const wins = Number((myRoster as any).settings?.wins ?? (myRoster as any).wins ?? 0);
    const losses = Number((myRoster as any).settings?.losses ?? (myRoster as any).losses ?? 0);
    const ties = Number((myRoster as any).settings?.ties ?? (myRoster as any).ties ?? 0);

    return { wins, losses, ties };
  } catch (error) {
    console.error('Error fetching user record for league:', leagueId, error);
    return { wins: 0, losses: 0, ties: 0 };
  }
}

export async function getSleeperPlayersByIds(
  ids: string[]
): Promise<Record<string, { id: string; full_name: string | null; position: string | null; team: string | null }>> {
  try {
    const allPlayers = await getAllNflPlayers();
    const map: Record<string, any> = {};
    for (const id of ids) {
      const p = allPlayers[id];
      if (p) {
        map[id] = {
          id,
          full_name: p.full_name ?? null,
          position: p.position ?? null,
          team: p.team ?? null,
        };
      }
    }
    return map;
  } catch (error) {
    console.error('Sleeper /players/nfl failed, falling back to local DB:', error);
    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: ids } },
    });
    const map: Record<string, any> = {};
    for (const p of players) {
      map[p.id] = p;
    }
    return map;
  }
}

export async function getSleeperPlayersProfilePicture(playerId: string): Promise<string | null> {
  try {
    if (!playerId) return null;

    const avatarUrl = `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(
      playerId
    )}.jpg`;

    const res = await fetch(avatarUrl, { cache: 'force-cache' });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      console.error('Sleeper player avatar fetch failed:', res.status, res.statusText);
      return null;
    }

    return res.url || avatarUrl;
  } catch (error) {
    console.error('Error fetching Sleeper player profile picture:', error);
    return null;
  }
}

