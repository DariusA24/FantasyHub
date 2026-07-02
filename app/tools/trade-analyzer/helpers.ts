import type { SleeperPick, SelectedPlayer, ValueMap, PlayerInfo } from "./types";
import { ROUND_NAMES } from "./constants";

export const pickName = (p: SleeperPick) =>
  `${p.season} ${ROUND_NAMES[p.round - 1] ?? `Rd ${p.round}`}`;

export const pickFcId = (p: SleeperPick) => `FP_${p.season}_${p.round}`;

export const pickKey = (p: SleeperPick) =>
  `${p.season}_${p.round}_${p.originalRosterId}`;

export const pickToSelectedPlayer = (pick: SleeperPick, valueMap: ValueMap): SelectedPlayer => {
  const fcId = pickFcId(pick);
  const val  = valueMap[fcId];
  return {
    sleeperId: `${fcId}_${pick.originalRosterId}`,
    name: pickName(pick),
    position: "PICK",
    team: "",
    value: val?.value ?? 0,
    trend: val?.trend ?? 0,
    redraftValue: 0,
    age: null,
    tier: val?.tier ?? null,
  };
};

export const rosterPlayerToSelectedPlayer = (
  playerId: string,
  infoMap: Record<string, PlayerInfo>,
  valueMap: ValueMap,
): SelectedPlayer => {
  const info = infoMap[playerId];
  const val  = valueMap[playerId];
  return {
    sleeperId: playerId,
    name: info?.full_name ?? playerId,
    position: info?.position ?? "",
    team: info?.team ?? "",
    value: val?.value ?? 0,
    trend: val?.trend ?? 0,
    redraftValue: val?.redraftValue ?? 0,
    age: val?.age ?? null,
    tier: val?.tier ?? null,
  };
};

export function parseStarterCounts(rosterPositions: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pos of rosterPositions) {
    if (pos === "BN" || pos === "IR") continue;
    counts[pos] = (counts[pos] ?? 0) + 1;
  }
  return counts;
}
