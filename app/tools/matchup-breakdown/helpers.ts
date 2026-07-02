import type { RosterPlayer, LineupAssignment, OptimizedLineup } from "./types";

const FLEX_ELIGIBLE = ["RB", "WR", "TE"];
const SUPER_FLEX_ELIGIBLE = ["QB", "RB", "WR", "TE"];

function fitsSlot(player: RosterPlayer, slotBase: string): boolean {
  if (slotBase === "FLEX") return FLEX_ELIGIBLE.includes(player.position);
  if (slotBase === "SUPER_FLEX") return SUPER_FLEX_ELIGIBLE.includes(player.position);
  return player.position === slotBase;
}

export function optimizeLineup(
  rosterPositions: string[],
  players: RosterPlayer[],
): OptimizedLineup {
  const starterBases = rosterPositions.filter(s => s !== "BN" && s !== "IR");

  // Number duplicate slots for display labels (RB→RB1/RB2 only when >1)
  const totalPerBase: Record<string, number> = {};
  for (const base of starterBases) totalPerBase[base] = (totalPerBase[base] ?? 0) + 1;

  const counters: Record<string, number> = {};
  const slots: Array<{ label: string; base: string; idx: number }> = [];
  starterBases.forEach((base, idx) => {
    counters[base] = (counters[base] ?? 0) + 1;
    const label = totalPerBase[base] > 1 ? `${base}${counters[base]}` : base;
    slots.push({ label, base, idx });
  });

  const byValue = [...players].sort((a, b) => b.redraftValue - a.redraftValue);
  const used = new Set<string>();
  const assignments = new Map<number, LineupAssignment>();

  // Fill specific positions first, then FLEX, then SUPER_FLEX
  const passes = [
    slots.filter(s => s.base !== "FLEX" && s.base !== "SUPER_FLEX"),
    slots.filter(s => s.base === "FLEX"),
    slots.filter(s => s.base === "SUPER_FLEX"),
  ];

  for (const pass of passes) {
    for (const { label, base, idx } of pass) {
      const eligible = byValue.filter(p => !used.has(p.sleeperId) && fitsSlot(p, base));
      const starter = eligible[0] ?? null;
      if (starter) used.add(starter.sleeperId);
      assignments.set(idx, {
        slot: label,
        slotBase: base,
        player: starter,
        alternatives: eligible.slice(1, 3),
      });
    }
  }

  const starters = slots.map(({ idx }) => assignments.get(idx)!);
  const bench = byValue.filter(p => !used.has(p.sleeperId));

  return { starters, bench };
}