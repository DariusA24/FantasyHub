// Pricing for season-long house futures ("The Book"): league champion odds and
// per-team regular-season win totals. Odds are frozen when a market is
// generated and never re-priced, so bettors lock in the number they see.

const CHAMPION_MARGIN = 1.15; // house overround baked into champion odds
const WIN_TOTAL_ODDS = 1.9;   // flat over/under juice, matching weekly totals
const MIN_ODDS = 1.05;
const MAX_ODDS = 26;          // longshot cap for champion outrights
// Sharpen championship probabilities so contenders separate from the pack.
const STRENGTH_EXP = 2.2;

function clampOdds(odds: number): number {
  return Math.round(Math.min(MAX_ODDS, Math.max(MIN_ODDS, odds)) * 100) / 100;
}

export type TeamStanding = {
  rosterId: number;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
};

/**
 * Champion outright odds. Strength blends season points-for with a small win
 * bonus; when no games have been played yet, every team is priced evenly.
 */
export function priceChampion(teams: TeamStanding[]): { rosterId: number; name: string; odds: number }[] {
  const n = teams.length;
  if (n === 0) return [];

  const anyPoints = teams.some((t) => t.pointsFor > 0);
  const strengths = teams.map((t) => {
    // Points-for is the strongest fantasy signal; nudge by win rate.
    const games = t.wins + t.losses;
    const winRate = games > 0 ? t.wins / games : 0.5;
    const base = anyPoints ? Math.max(t.pointsFor, 1) : 1;
    return Math.pow(base, STRENGTH_EXP) * (0.75 + 0.5 * winRate);
  });
  const total = strengths.reduce((a, b) => a + b, 0) || 1;

  return teams.map((t, i) => {
    const prob = strengths[i] / total;
    const juiced = Math.min(0.95, prob * CHAMPION_MARGIN);
    return { rosterId: t.rosterId, name: t.name, odds: clampOdds(1 / juiced) };
  });
}

/**
 * Per-team win-total line: project full-season wins from current pace and set
 * the over/under there. Both sides pay the flat total juice.
 */
export function priceWinTotal(
  team: TeamStanding,
  regularSeasonGames: number
): { line: number; overOdds: number; underOdds: number } {
  const games = team.wins + team.losses;
  const pace = games > 0 ? team.wins / games : 0.5;
  const projectedWins =
    games > 0 ? team.wins + pace * (regularSeasonGames - games) : regularSeasonGames * 0.5;
  // Land on a half-win so the bet can't push.
  const line = Math.round(projectedWins * 2) / 2;
  const half = Number.isInteger(line) ? line + 0.5 : line;
  return { line: half, overOdds: WIN_TOTAL_ODDS, underOdds: WIN_TOTAL_ODDS };
}
