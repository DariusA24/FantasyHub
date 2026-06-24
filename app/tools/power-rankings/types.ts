export type League = {
  id: string;
  name: string;
  role: string;
  latestSeason: { sleeperLeagueId: string; season: string } | null;
};

export type PlayerSnap = {
  id: string;
  name: string;
  value: number;
  posRank: number;
};

export type PickSnap = {
  key: string;
  name: string;
  value: number;
};

export type SleeperPick = {
  season: string;
  round: number;
  originalRosterId: number;
};

export type TeamData = {
  rosterId: number;
  userId: string;
  displayName: string;
  avatar: string | null;
  totalValue: number;
  posValues: Record<string, number>;
  topByPos: Record<string, PlayerSnap[]>;
  picksValue: number;
  picks: PickSnap[];
  overallRank: number;
  posRanks: Record<string, number>;
  picksRank: number;
};

export const KEY_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

export const POS_TEXT: Record<string, string> = {
  QB: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
};
