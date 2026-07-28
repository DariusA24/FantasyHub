// Pure constants (no server-only imports) so both the server loader and client
// components can use them.

export const SLOT_MAP: Record<number, string> = {
  0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'D/ST', 17: 'K',
  20: 'BN', 21: 'IR', 23: 'FLEX', 24: 'FLEX',
};

export const POS_COLORS: Record<string, string> = {
  QB:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  WR:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  RB:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  TE:   'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  K:    'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
  'D/ST': 'bg-red-500/10 text-red-500 dark:text-red-400',
  FLEX: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  BN:   'bg-zinc-400/10 text-zinc-400 dark:text-zinc-600',
  IR:   'bg-rose-500/10 text-rose-400',
};
