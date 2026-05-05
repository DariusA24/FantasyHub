import { describe, expect, it, jest } from '@jest/globals';
import {
  fetchAdpRankings,
  fetchAdpForPosition,
  fetchAdpForPlayer,
} from './fantasyCalcActions';

jest.mock('./fantasyCalcService', () => ({
  getAdpRankings: jest.fn(),
  getAdpByPosition: jest.fn(),
}));

const { getAdpRankings, getAdpByPosition } = require('./fantasyCalcService');

const mockPlayer = (overrides: Partial<{
  player_id: number;
  name: string;
  position: string;
  team: string;
  adp: number;
  adp_formatted: string;
  times_drafted: number;
  high: number;
  low: number;
  stdev: number;
  bye: number;
}> = {}) => ({
  player_id: 1,
  name: 'Patrick Mahomes',
  position: 'QB',
  team: 'KC',
  adp: 42.3,
  adp_formatted: '4.02',
  times_drafted: 870,
  high: 38,
  low: 55,
  stdev: 3.2,
  bye: 10,
  ...overrides,
});

const mockMeta = {
  type: 'PPR',
  teams: 12,
  rounds: 15,
  total_drafts: 870,
  start_date: '2024-09-01',
  end_date: '2024-09-30',
};

const mockAdpResponse = {
  status: 'Success',
  meta: mockMeta,
  players: [mockPlayer()],
};

describe('fantasyCalcActions.fetchAdpRankings', () => {
  it('returns the full ADP response', async () => {
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    const result = await fetchAdpRankings();

    expect(getAdpRankings).toHaveBeenCalledWith({});
    expect(result).toEqual(mockAdpResponse);
  });

  it('forwards params to the service', async () => {
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    await fetchAdpRankings({ format: 'ppr', teams: 12, year: 2024 });

    expect(getAdpRankings).toHaveBeenCalledWith({ format: 'ppr', teams: 12, year: 2024 });
  });

  it('returns null and logs error on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getAdpRankings as jest.MockedFunction<any>).mockRejectedValue(new Error('API down'));

    const result = await fetchAdpRankings();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching ADP rankings:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('fantasyCalcActions.fetchAdpForPosition', () => {
  it('returns players for a given position', async () => {
    const qbs = [mockPlayer({ position: 'QB' })];
    (getAdpByPosition as jest.MockedFunction<any>).mockResolvedValue(qbs);

    const result = await fetchAdpForPosition('QB');

    expect(getAdpByPosition).toHaveBeenCalledWith('QB', {});
    expect(result).toEqual(qbs);
  });

  it('forwards additional params to the service', async () => {
    (getAdpByPosition as jest.MockedFunction<any>).mockResolvedValue([]);

    await fetchAdpForPosition('WR', { format: 'standard', teams: 10 });

    expect(getAdpByPosition).toHaveBeenCalledWith('WR', { format: 'standard', teams: 10 });
  });

  it('returns empty array and logs error on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getAdpByPosition as jest.MockedFunction<any>).mockRejectedValue(new Error('timeout'));

    const result = await fetchAdpForPosition('TE');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching ADP for position TE:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('fantasyCalcActions.fetchAdpForPlayer', () => {
  it('returns the matching player by name', async () => {
    const player = mockPlayer({ name: 'Patrick Mahomes' });
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue({
      ...mockAdpResponse,
      players: [player],
    });

    const result = await fetchAdpForPlayer('Mahomes');

    expect(result).toEqual(player);
  });

  it('matches case-insensitively', async () => {
    const player = mockPlayer({ name: 'Patrick Mahomes' });
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue({
      ...mockAdpResponse,
      players: [player],
    });

    const result = await fetchAdpForPlayer('mahomes');

    expect(result).toEqual(player);
  });

  it('returns the first match when multiple players match the query', async () => {
    const p1 = mockPlayer({ player_id: 1, name: 'Justin Jefferson' });
    const p2 = mockPlayer({ player_id: 2, name: 'Jefferson Street WR' });
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue({
      ...mockAdpResponse,
      players: [p1, p2],
    });

    const result = await fetchAdpForPlayer('Jefferson');

    expect(result?.player_id).toBe(1);
  });

  it('returns null when no player matches', async () => {
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue({
      ...mockAdpResponse,
      players: [mockPlayer({ name: 'Patrick Mahomes' })],
    });

    const result = await fetchAdpForPlayer('Tyreek Hill');

    expect(result).toBeNull();
  });

  it('forwards params to the service', async () => {
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    await fetchAdpForPlayer('Mahomes', { format: 'dynasty', year: 2024 });

    expect(getAdpRankings).toHaveBeenCalledWith({ format: 'dynasty', year: 2024 });
  });

  it('returns null and logs error on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getAdpRankings as jest.MockedFunction<any>).mockRejectedValue(new Error('network error'));

    const result = await fetchAdpForPlayer('Mahomes');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching ADP for player Mahomes:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});