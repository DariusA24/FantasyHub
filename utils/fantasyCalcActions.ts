'use server';

import {
  getAdpRankings,
  getAdpByPosition,
  type FFCalcAdpParams,
  type FFCalcAdpResponse,
  type FFCalcFormat,
  type FFCalcPlayer,
} from './fantasyCalcService';
import { getSleeperLeagueSettings } from './sleeperActions';

/**
 * Returns true when the league has a SUPER_FLEX roster slot, meaning QBs
 * are significantly more valuable than in single-QB leagues.
 */
export function leagueIsSuperFlex(leagueData: any): boolean {
  return (leagueData?.roster_positions as string[] | undefined)?.includes('SUPER_FLEX') ?? false;
}

/**
 * Derives the best Fantasy Football Calculator format for the *scoring* side
 * of a Sleeper league. SuperFlex is handled separately via adjustQbAdpForSuperFlex.
 *
 * Priority:
 *  1. dynasty  → settings.type === 2
 *  2. ppr      → scoring_settings.rec >= 1
 *  3. half-ppr → scoring_settings.rec >= 0.5
 *  4. standard → fallback
 *
 * Note: '2qb' is intentionally not returned here. If the league is SuperFlex,
 * call adjustQbAdpForSuperFlex on the resulting player list instead so that
 * the correct rec-scoring values are preserved for non-QB positions.
 */
export function sleeperSettingsToFFCalcFormat(leagueData: any): FFCalcFormat {
  if (leagueData?.settings?.type === 2) return 'dynasty';
  const rec = leagueData?.scoring_settings?.rec ?? 0;
  if (rec >= 1) return 'ppr';
  if (rec >= 0.5) return 'half-ppr';
  return 'standard';
}


export async function fetchAdpRankings(
  params: FFCalcAdpParams = {}
): Promise<FFCalcAdpResponse | null> {
  try {
    return await getAdpRankings(params);
  } catch (error) {
    console.error('Error fetching ADP rankings:', error);
    return null;
  }
}

export async function fetchAdpForPosition(
  position: string,
  params: Omit<FFCalcAdpParams, 'position'> = {}
): Promise<FFCalcPlayer[]> {
  try {
    return await getAdpByPosition(position, params);
  } catch (error) {
    console.error(`Error fetching ADP for position ${position}:`, error);
    return [];
  }
}

/**
 * Fetches ADP rankings using the scoring format derived from a Sleeper league's settings.
 * When the league has a SUPER_FLEX roster slot, QB ADP values are compressed to
 * reflect their elevated value without losing the correct rec-scoring data for
 * all other positions.
 *
 * Pass extra `params` to override anything (e.g. year, count).
 */
export async function fetchAdpRankingsForLeague(
  sleeperLeagueId: string,
  params: Omit<FFCalcAdpParams, 'format' | 'teams'> = {}
): Promise<{ format: FFCalcFormat; teams: number; isSuperFlex: boolean; data: FFCalcAdpResponse } | null> {
  try {
    const leagueData = await getSleeperLeagueSettings(sleeperLeagueId);
    const format = sleeperSettingsToFFCalcFormat(leagueData);
    const teams: number = leagueData?.settings?.num_teams ?? 12;
    const isSuperFlex = leagueIsSuperFlex(leagueData);

    let data: FFCalcAdpResponse;
    if (isSuperFlex) {
      // Fetch both datasets in parallel; merge QB rows from 2qb into scoring data
      const [sfRaw, scoringRaw] = await Promise.all([
        getAdpRankings({ format: '2qb', teams, ...params }),
        getAdpRankings({ format, teams, ...params }),
      ]);
      const sfQbs = sfRaw.players.filter((p) => p.position === 'QB');
      const nonQbs = scoringRaw.players.filter((p) => p.position !== 'QB');
      const merged = [...sfQbs, ...nonQbs].sort((a, b) => a.adp - b.adp);
      data = { ...scoringRaw, players: merged };
    } else {
      data = await getAdpRankings({ format, teams, ...params });
    }

    return { format, teams, isSuperFlex, data };
  } catch (error) {
    console.error('Error fetching ADP for Sleeper league:', sleeperLeagueId, error);
    return null;
  }
}

export async function fetchAdpForPlayer(
  playerName: string,
  params: FFCalcAdpParams = {}
): Promise<FFCalcPlayer | null> {
  try {
    const data = await getAdpRankings(params);
    const normalized = playerName.toLowerCase();
    return (
      data.players.find((p) => p.name.toLowerCase().includes(normalized)) ?? null
    );
  } catch (error) {
    console.error(`Error fetching ADP for player ${playerName}:`, error);
    return null;
  }
}
