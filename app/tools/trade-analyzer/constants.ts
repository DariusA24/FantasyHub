export const POSITION_COLOR: Record<string, string> = {
  QB:   "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB:   "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR:   "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE:   "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
  K:    "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
  DEF:  "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40",
  PICK: "text-amber-600 dark:text-[#F4D06F] bg-amber-500/10 border-amber-400/30",
};

export const TIER_COLOR: Record<number, string> = {
  1: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  2: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  3: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
  4: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40",
  5: "text-zinc-500 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/40",
};

export const BENCH_SPOT_VALUE = 425;

export const ROUND_NAMES = ["1st", "2nd", "3rd", "4th", "5th"];

export const KEY_POSITIONS = ["QB", "RB", "WR", "TE"];

export const FLEX_MAP: Record<string, string[]> = {
  FLEX:       ["RB", "WR", "TE"],
  REC_FLEX:   ["WR", "TE"],
  WRRB_FLEX:  ["WR", "RB"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
};
