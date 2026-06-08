import { describe, expect, it, jest } from '@jest/globals';
import {
  getMaddenStatsByPlayerId,
  getLatestMaddenStatsByPlayerId,
  searchMaddenPlayers,
} from './maddenActions';

jest.mock('./db', () => ({
  prisma: {
    maddenPlayer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('./db');

// A realistic raw Prisma row as the DB would return it
const mockRow = {
  id: 'sleeper-1',
  full_name: 'Patrick Mahomes',
  position: 'QB',
  team: 'KC',
  year: 2024,
  week: 1,
  overall: 99,
  shared_stats: { spd: 87, str: 65, agi: 88, awr: 99, acc: 89 },
  qb_stats: { throw_power: 99, throw_accuracy_short: 95, throw_accuracy_mid: 97, throw_accuracy_deep: 93 },
  wr_stats: {},
  te_stats: {},
  rb_stats: {},
  k_stats: {},
  created_at: new Date('2024-01-01'),
};

// Expected mapped output
const expectedStats = {
  id: 'sleeper-1',
  full_name: 'Patrick Mahomes',
  position: 'QB',
  team: 'KC',
  year: 2024,
  week: 1,
  overall: 99,
  shared_stats: { spd: 87, str: 65, agi: 88, awr: 99, acc: 89 },
  qb_stats: { throw_power: 99, throw_accuracy_short: 95, throw_accuracy_mid: 97, throw_accuracy_deep: 93 },
  wr_stats: null,
  te_stats: null,
  rb_stats: null,
  k_stats: null,
};

describe('getMaddenStatsByPlayerId', () => {
  it('returns mapped stats when player is found', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockRow);

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(prisma.maddenPlayer.findUnique).toHaveBeenCalledWith({
      where: { id_year_week: { id: 'sleeper-1', year: 2024, week: 1 } },
    });
    expect(result).toEqual(expectedStats);
  });

  it('returns null when player is not found', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue(null);

    const result = await getMaddenStatsByPlayerId('unknown', 2024, 1);

    expect(result).toBeNull();
  });

  it('returns null and logs error on db failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockRejectedValue(new Error('db error'));

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching Madden stats:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('maps null overall correctly', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockRow,
      overall: null,
    });

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(result?.overall).toBeNull();
  });
});

describe('getLatestMaddenStatsByPlayerId', () => {
  it('returns most recent stats for a player', async () => {
    (prisma.maddenPlayer.findFirst as jest.MockedFunction<any>).mockResolvedValue(mockRow);

    const result = await getLatestMaddenStatsByPlayerId('sleeper-1');

    expect(prisma.maddenPlayer.findFirst).toHaveBeenCalledWith({
      where: { id: 'sleeper-1' },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
    });
    expect(result).toEqual(expectedStats);
  });

  it('returns null when no stats exist for player', async () => {
    (prisma.maddenPlayer.findFirst as jest.MockedFunction<any>).mockResolvedValue(null);

    const result = await getLatestMaddenStatsByPlayerId('no-such-player');

    expect(result).toBeNull();
  });

  it('returns null and logs error on db failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.maddenPlayer.findFirst as jest.MockedFunction<any>).mockRejectedValue(new Error('conn timeout'));

    const result = await getLatestMaddenStatsByPlayerId('sleeper-1');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching latest Madden stats:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('searchMaddenPlayers', () => {
  it('returns mapped results matching the query', async () => {
    (prisma.maddenPlayer.findMany as jest.MockedFunction<any>).mockResolvedValue([mockRow]);

    const results = await searchMaddenPlayers('Mahomes');

    expect(prisma.maddenPlayer.findMany).toHaveBeenCalledWith({
      where: { full_name: { contains: 'Mahomes', mode: 'insensitive' } },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
      take: 20,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expectedStats);
  });

  it('passes year and week filters when provided', async () => {
    (prisma.maddenPlayer.findMany as jest.MockedFunction<any>).mockResolvedValue([mockRow]);

    await searchMaddenPlayers('Mahomes', 2024, 5);

    expect(prisma.maddenPlayer.findMany).toHaveBeenCalledWith({
      where: { full_name: { contains: 'Mahomes', mode: 'insensitive' }, year: 2024, week: 5 },
      orderBy: [{ year: 'desc' }, { week: 'desc' }],
      take: 20,
    });
  });

  it('returns empty array when no players match', async () => {
    (prisma.maddenPlayer.findMany as jest.MockedFunction<any>).mockResolvedValue([]);

    const results = await searchMaddenPlayers('zzznomatch');

    expect(results).toEqual([]);
  });

  it('returns empty array and logs error on db failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.maddenPlayer.findMany as jest.MockedFunction<any>).mockRejectedValue(new Error('db down'));

    const results = await searchMaddenPlayers('Mahomes');

    expect(results).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Error searching Madden players:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('JSONB stats mapping', () => {
  it('converts empty JSONB objects to null', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockRow,
      shared_stats: {},
      qb_stats: {},
    });

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(result?.shared_stats).toBeNull();
    expect(result?.qb_stats).toBeNull();
  });

  it('filters out non-numeric values from JSONB', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockRow,
      shared_stats: { spd: 90, name: 'should be removed', flag: true },
    });

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(result?.shared_stats).toEqual({ spd: 90 });
  });

  it('handles null JSONB columns', async () => {
    (prisma.maddenPlayer.findUnique as jest.MockedFunction<any>).mockResolvedValue({
      ...mockRow,
      shared_stats: null,
      qb_stats: null,
    });

    const result = await getMaddenStatsByPlayerId('sleeper-1', 2024, 1);

    expect(result?.shared_stats).toBeNull();
    expect(result?.qb_stats).toBeNull();
  });
});