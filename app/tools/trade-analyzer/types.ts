export type Settings = { isDynasty: boolean; numQbs: 1 | 2; ppr: 0 | 0.5 | 1 };

export type PlayerValue = {
  name: string; position: string; team: string;
  value: number; trend: number; redraftValue: number;
  age: number | null; tier: number | null;
};

export type ValueMap = Record<string, PlayerValue>;

export type SelectedPlayer = {
  sleeperId: string; name: string; position: string; team: string;
  value: number; trend: number; redraftValue: number;
  age: number | null; tier: number | null;
};

export type SearchResult = {
  id: string; full_name: string | null; position: string | null; team: string | null;
};

export type League = {
  id: string; name: string; role: string;
  latestSeason: { sleeperLeagueId: string; season: string } | null;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  picks: any[] | null;
};

export type SleeperPick = {
  season: string;
  round: number;
  originalRosterId: number;
};

export type SleeperUser = { user_id: string; display_name: string; avatar: string | null };

export type PlayerInfo = {
  id: string; full_name: string | null; position: string | null; team: string | null;
};

export type LeagueTeam = { roster: SleeperRoster; user: SleeperUser | null };
