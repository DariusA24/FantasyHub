import { describe, expect, it } from '@jest/globals';
import { getAdpRankings, getAdpByPosition } from './fantasyCalcService';
import { mockFetchOnce } from '../tests/test-utils/mockFetch';

const mockPlayer = {
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
};

const mockMeta = {
  type: 'PPR',
  teams: 12,
  rounds: 15,
  total_drafts: 870,
  start_date: '2024-09-01',
  end_date: '2024-09-30',
};

const mockResponse = {
  status: 'Success',
  meta: mockMeta,
  players: [mockPlayer],
};

describe('fantasyCalcService.getAdpRankings', () => {
  it('returns the full ADP response', async () => {
    mockFetchOnce({ json: mockResponse });

    const result = await getAdpRankings();

    expect(result).toEqual(mockResponse);
  });

  it('uses format as a path segment when provided', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings({ format: 'ppr' });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/adp/ppr');
    expect(calledUrl).not.toContain('format=');
  });

  it('sends teams param when provided', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings({ teams: 10 });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('teams=10');
  });

  it('sends year param when provided', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings({ year: 2024 });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('year=2024');
  });

  it('sends count param when provided', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings({ count: 50 });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('count=50');
  });

  it('combines format path segment with other query params', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings({ format: 'standard', teams: 12, year: 2024 });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/adp/standard');
    expect(calledUrl).not.toContain('format=');
    expect(calledUrl).toContain('teams=12');
    expect(calledUrl).toContain('year=2024');
  });

  it('omits params that are not provided', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpRankings();

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('format=');
    expect(calledUrl).not.toContain('teams=');
    expect(calledUrl).not.toContain('year=');
  });

  it('throws on non-OK response', async () => {
    mockFetchOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(getAdpRankings()).rejects.toThrow(
      'Fantasy Football Calculator API error: 500 Internal Server Error'
    );
  });

  it('throws on network failure', async () => {
    mockFetchOnce(new Error('network timeout'));

    await expect(getAdpRankings()).rejects.toThrow('network timeout');
  });
});

describe('fantasyCalcService.getAdpByPosition', () => {
  it('returns only the players array', async () => {
    mockFetchOnce({ json: mockResponse });

    const result = await getAdpByPosition('QB');

    expect(result).toEqual([mockPlayer]);
  });

  it('sends position param in the request', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpByPosition('WR');

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('position=WR');
  });

  it('forwards additional params alongside position', async () => {
    mockFetchOnce({ json: mockResponse });

    await getAdpByPosition('RB', { format: 'ppr', teams: 12 });

    const calledUrl = (global.fetch as jest.MockedFunction<any>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/adp/ppr');
    expect(calledUrl).not.toContain('format=');
    expect(calledUrl).toContain('position=RB');
    expect(calledUrl).toContain('teams=12');
  });

  it('returns empty array when players list is empty', async () => {
    mockFetchOnce({ json: { ...mockResponse, players: [] } });

    const result = await getAdpByPosition('K');

    expect(result).toEqual([]);
  });

  it('throws on non-OK response', async () => {
    mockFetchOnce({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(getAdpByPosition('QB')).rejects.toThrow(
      'Fantasy Football Calculator API error: 404 Not Found'
    );
  });
});