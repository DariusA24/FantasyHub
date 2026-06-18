import { describe, expect, it, jest } from '@jest/globals';
import {
  fetchAdpRankings,
  fetchAdpForPosition,
  fetchAdpForPlayer,
  sleeperSettingsToFFCalcFormat,
  fetchAdpRankingsForLeague,
} from './fantasyCalcActions';

jest.mock('./fantasyCalcService', () => ({
  getAdpRankings: jest.fn(),
  getAdpByPosition: jest.fn(),
}));

jest.mock('./sleeperActions', () => ({
  getSleeperLeagueSettings: jest.fn(),
}));

const { getAdpRankings, getAdpByPosition } = require('./fantasyCalcService');
const { getSleeperLeagueSettings } = require('./sleeperActions');

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

describe('fantasyCalcActions.sleeperSettingsToFFCalcFormat', () => {
  it('returns "dynasty" when settings.type === 2', () => {
    const leagueData = { settings: { type: 2 } };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('dynasty');
  });

  it('returns "2qb" when roster_positions includes SUPER_FLEX', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'SUPER_FLEX', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 1 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('2qb');
  });

  it('returns "ppr" when rec >= 1 and no dynasty/2qb signals', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 1 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('ppr');
  });

  it('returns "ppr" when rec is greater than 1', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 1.5 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('ppr');
  });

  it('returns "half-ppr" when rec === 0.5', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 0.5 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('half-ppr');
  });

  it('returns "standard" when rec === 0', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 0 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('standard');
  });

  it('returns "standard" when scoring_settings is missing', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'BN'],
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('standard');
  });

  it('returns "standard" when input is null', () => {
    expect(sleeperSettingsToFFCalcFormat(null)).toBe('standard');
  });

  it('returns "standard" when input is undefined', () => {
    expect(sleeperSettingsToFFCalcFormat(undefined)).toBe('standard');
  });

  it('dynasty check takes priority over SUPER_FLEX', () => {
    const leagueData = {
      settings: { type: 2 },
      roster_positions: ['QB', 'SUPER_FLEX', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 1 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('dynasty');
  });

  it('SUPER_FLEX check takes priority over rec scoring', () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'SUPER_FLEX', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 0 },
    };
    expect(sleeperSettingsToFFCalcFormat(leagueData)).toBe('2qb');
  });
});

describe('fantasyCalcActions.fetchAdpRankingsForLeague', () => {
  it('returns format, teams, and data derived from league settings', async () => {
    const leagueData = {
      settings: { type: 0, num_teams: 10 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 1 },
    };
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockResolvedValue(leagueData);
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    const result = await fetchAdpRankingsForLeague('league-123');

    expect(getSleeperLeagueSettings).toHaveBeenCalledWith('league-123');
    expect(getAdpRankings).toHaveBeenCalledWith({ format: 'ppr', teams: 10 });
    expect(result).toEqual({ format: 'ppr', teams: 10, data: mockAdpResponse });
  });

  it('falls back to 12 teams when num_teams is missing', async () => {
    const leagueData = {
      settings: { type: 0 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'FLEX', 'BN'],
      scoring_settings: { rec: 0.5 },
    };
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockResolvedValue(leagueData);
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    const result = await fetchAdpRankingsForLeague('league-456');

    expect(getAdpRankings).toHaveBeenCalledWith({ format: 'half-ppr', teams: 12 });
    expect(result).toEqual({ format: 'half-ppr', teams: 12, data: mockAdpResponse });
  });

  it('merges extra params into the getAdpRankings call', async () => {
    const leagueData = {
      settings: { type: 0, num_teams: 8 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 0 },
    };
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockResolvedValue(leagueData);
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    const result = await fetchAdpRankingsForLeague('league-789', { year: 2024, count: 50 });

    expect(getAdpRankings).toHaveBeenCalledWith({ format: 'standard', teams: 8, year: 2024, count: 50 });
    expect(result).toEqual({ format: 'standard', teams: 8, data: mockAdpResponse });
  });

  it('derives dynasty format from league settings', async () => {
    const leagueData = {
      settings: { type: 2, num_teams: 12 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 1 },
    };
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockResolvedValue(leagueData);
    (getAdpRankings as jest.MockedFunction<any>).mockResolvedValue(mockAdpResponse);

    const result = await fetchAdpRankingsForLeague('league-dynasty');

    expect(result).toEqual({ format: 'dynasty', teams: 12, data: mockAdpResponse });
  });

  it('returns null and logs error when getSleeperLeagueSettings throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockRejectedValue(new Error('not found'));

    const result = await fetchAdpRankingsForLeague('bad-league');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching ADP for Sleeper league:',
      'bad-league',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('returns null and logs error when getAdpRankings throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const leagueData = {
      settings: { type: 0, num_teams: 12 },
      roster_positions: ['QB', 'WR', 'RB', 'TE', 'BN'],
      scoring_settings: { rec: 1 },
    };
    (getSleeperLeagueSettings as jest.MockedFunction<any>).mockResolvedValue(leagueData);
    (getAdpRankings as jest.MockedFunction<any>).mockRejectedValue(new Error('API down'));

    const result = await fetchAdpRankingsForLeague('league-err');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching ADP for Sleeper league:',
      'league-err',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});