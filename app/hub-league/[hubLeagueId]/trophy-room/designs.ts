// Year → trophy design mapping. Every season from 2020 on gets its own
// silhouette; anything earlier shares the Founders Cup.
export type TrophyDesignKey =
  | "vintage"
  | "globe"
  | "star"
  | "ring"
  | "chalice"
  | "cup"
  | "football"
  | "spire";

export const DESIGN_LABELS: Record<TrophyDesignKey, string> = {
  spire:    "Crystal Spire",
  football: "Golden Pigskin",
  cup:      "Classic Cup",
  chalice:  "Winged Chalice",
  ring:     "Championship Ring",
  star:     "Star Pillar",
  globe:    "Globe Trophy",
  vintage:  "Founders Cup",
};

// Index 0 = season 2020. Years beyond the list cycle back through it.
const YEAR_DESIGNS: TrophyDesignKey[] = [
  "globe",    // 2020
  "star",     // 2021
  "ring",     // 2022
  "chalice",  // 2023
  "cup",      // 2024
  "football", // 2025
  "spire",    // 2026
];

export function getTrophyDesign(season: string | number): { key: TrophyDesignKey; label: string } {
  const year = Number(season);
  if (!Number.isFinite(year) || year < 2020) {
    return { key: "vintage", label: DESIGN_LABELS.vintage };
  }
  const key = YEAR_DESIGNS[(year - 2020) % YEAR_DESIGNS.length];
  return { key, label: DESIGN_LABELS[key] };
}
