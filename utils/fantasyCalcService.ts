const FFCALCULATOR_BASE = 'https://fantasyfootballcalculator.com/api/v1/adp';

export type FFCalcFormat = 'standard' | 'ppr' | 'half-ppr' | '2qb' | 'dynasty' | 'rookie';

export type FFCalcAdpParams = {
  format?: FFCalcFormat;
  teams?: number;
  year?: number;
  count?: number;
  position?: string;
};

export type FFCalcPlayer = {
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
};

export type FFCalcMeta = {
  type: string;
  teams: number;
  rounds: number;
  total_drafts: number;
  start_date: string;
  end_date: string;
};

export type FFCalcAdpResponse = {
  status: string;
  meta: FFCalcMeta;
  players: FFCalcPlayer[];
};

async function ffcalcRequest<T>(params: FFCalcAdpParams = {}): Promise<T> {
  // Format is a path segment, not a query param: /api/v1/adp/dynasty
  const base = params.format
    ? `${FFCALCULATOR_BASE}/${params.format}`
    : FFCALCULATOR_BASE;

  const url = new URL(base);

  if (params.teams !== undefined) url.searchParams.set('teams', String(params.teams));
  if (params.year !== undefined) url.searchParams.set('year', String(params.year));
  if (params.count !== undefined) url.searchParams.set('count', String(params.count));
  if (params.position) url.searchParams.set('position', params.position);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error(`Fantasy Football Calculator API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getAdpRankings(params: FFCalcAdpParams = {}): Promise<FFCalcAdpResponse> {
  return ffcalcRequest<FFCalcAdpResponse>(params);
}

export async function getAdpByPosition(
  position: string,
  params: Omit<FFCalcAdpParams, 'position'> = {}
): Promise<FFCalcPlayer[]> {
  const data = await ffcalcRequest<FFCalcAdpResponse>({ ...params, position });
  return data.players;
}