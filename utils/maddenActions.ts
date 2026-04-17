'use server';

import { prisma } from './db';

export type MaddenPlayerStats = {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  year: number;
  week: number;
  overall: number | null;
  shared_stats: Record<string, number> | null;
  qb_stats: Record<string, number> | null;
  wr_stats: Record<string, number> | null;
  te_stats: Record<string, number> | null;
  rb_stats: Record<string, number> | null;
  k_stats: Record<string, number> | null;
};

function toStatsRecord(json: unknown): Record<string, number> | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return null;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => [k, v as number])
  );
}

function mapPlayer(player: {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  year: number;
  week: number;
  overall: number | null;
  shared_stats: unknown;
  qb_stats: unknown;
  wr_stats: unknown;
  te_stats: unknown;
  rb_stats: unknown;
  k_stats: unknown;
}): MaddenPlayerStats {
  return {
    id: player.id,
    full_name: player.full_name,
    position: player.position,
    team: player.team,
    year: player.year,
    week: player.week,
    overall: player.overall,
    shared_stats: toStatsRecord(player.shared_stats),
    qb_stats: toStatsRecord(player.qb_stats),
    wr_stats: toStatsRecord(player.wr_stats),
    te_stats: toStatsRecord(player.te_stats),
    rb_stats: toStatsRecord(player.rb_stats),
    k_stats: toStatsRecord(player.k_stats),
  };
}

export async function getMaddenStatsByPlayerId(
  sleeperPlayerId: string,
  year: number,
  week: number
): Promise<MaddenPlayerStats | null> {
  try {
    const player = await prisma.maddenPlayer.findUnique({
      where: {
        id_year_week: {
          id: sleeperPlayerId,
          year,
          week,
        },
      },
    });

    if (!player) return null;
    return mapPlayer(player);
  } catch (error) {
    console.error('Error fetching Madden stats:', error);
    return null;
  }
}

export async function getLatestMaddenStatsByPlayerId(
  sleeperPlayerId: string
): Promise<MaddenPlayerStats | null> {
  try {
    const player = await prisma.maddenPlayer.findFirst({
      where: { id: sleeperPlayerId },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
    });

    if (!player) return null;
    return mapPlayer(player);
  } catch (error) {
    console.error('Error fetching latest Madden stats:', error);
    return null;
  }
}

export async function searchMaddenPlayers(
  query: string,
  year?: number,
  week?: number
): Promise<MaddenPlayerStats[]> {
  try {
    const players = await prisma.maddenPlayer.findMany({
      where: {
        full_name: { contains: query, mode: 'insensitive' },
        ...(year !== undefined ? { year } : {}),
        ...(week !== undefined ? { week } : {}),
      },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
      take: 20,
    });

    return players.map(mapPlayer);
  } catch (error) {
    console.error('Error searching Madden players:', error);
    return [];
  }
}