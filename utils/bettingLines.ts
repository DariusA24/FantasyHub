// Odds pricing + lock rules for house betting lines ("The Book").

// Logistic scale for converting a projected point differential into a win
// probability. Weekly fantasy score differentials have a std dev around
// 28-30 points; logistic scale ≈ σ·√3/π ≈ 16.
const LOGISTIC_SCALE = 16;

// House edge applied to each side's implied probability (~4.5% overround total).
const SIDE_MARGIN = 1.0225;

const MIN_ODDS = 1.05;
const MAX_ODDS = 12;

/** Win probability for the "home" side given projected points for each side. */
export function winProbability(homeProjected: number, awayProjected: number): number {
  const diff = homeProjected - awayProjected;
  return 1 / (1 + Math.exp(-diff / LOGISTIC_SCALE));
}

function toDecimalOdds(prob: number): number {
  const juiced = Math.min(0.99, prob * SIDE_MARGIN);
  const odds = 1 / juiced;
  return Math.round(Math.min(MAX_ODDS, Math.max(MIN_ODDS, odds)) * 100) / 100;
}

/** Price a matchup: moneyline odds for both sides plus the over/under total. */
export function priceMatchup(homeProjected: number, awayProjected: number) {
  const pHome = winProbability(homeProjected, awayProjected);
  return {
    homeOdds: toDecimalOdds(pHome),
    awayOdds: toDecimalOdds(1 - pHome),
    // Round the total to the nearest 0.5 so pushes stay possible but rare
    totalLine: Math.round((homeProjected + awayProjected) * 2) / 2,
    overOdds: 1.9,
    underOdds: 1.9,
  };
}

/**
 * Lines lock for the rest of the NFL week once Thursday night football is
 * close (Fri 00:00 UTC ≈ Thu 7-8pm ET) and stay locked through Monday night.
 * Sleeper rolls its week forward on Tuesday, which reopens betting.
 * Outside the regular season (off/pre) no games are being played, so week-1
 * lines stay open regardless of weekday.
 */
export function isWeekLocked(seasonType: string, now: Date = new Date()): boolean {
  if (seasonType === "off" || seasonType === "pre") return false;
  const day = now.getUTCDay(); // 0 Sun, 1 Mon, ... 6 Sat
  return day === 5 || day === 6 || day === 0 || day === 1;
}

/** Winnings credited for a settled wager (includes the returned stake). */
export function wagerPayout(stake: number, odds: number): number {
  return Math.floor(stake * odds);
}
