'use server';

import {
  getAdpRankings,
  getAdpByPosition,
  type FFCalcAdpParams,
  type FFCalcAdpResponse,
  type FFCalcPlayer,
} from './fantasyCalcService';

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
