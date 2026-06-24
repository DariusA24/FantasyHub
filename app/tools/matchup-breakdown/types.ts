export type League = {
  id: string;
  name: string;
  role: string;
  latestSeason: { sleeperLeagueId: string; season: string } | null;
};

export type RosterPlayer = {
  sleeperId: string;
  name: string;
  position: string;
  team: string;
  redraftValue: number;
};

export type LineupAssignment = {
  slot: string;
  slotBase: string;
  player: RosterPlayer | null;
  alternatives: RosterPlayer[];
};

export type OptimizedLineup = {
  starters: LineupAssignment[];
  bench: RosterPlayer[];
};

export const POS_STYLE: Record<string, string> = {
  QB: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
  K:  "text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
  DEF:"text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
  FLEX: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  SUPER_FLEX: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
};