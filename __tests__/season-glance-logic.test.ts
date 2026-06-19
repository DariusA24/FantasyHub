/**
 * Pure unit tests for the "Season at a Glance" computation logic.
 * These mirror the inline logic in the matchup API route without any I/O.
 */

// ─── Helpers copied from matchup/route.ts ────────────────────────────────────

type RosterSettings = {
  wins?: number;
  losses?: number;
  ties?: number;
  fpts?: number;
  fpts_decimal?: number;
  fpts_against?: number;
  fpts_against_decimal?: number;
  streak?: number;
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  settings?: RosterSettings;
};

function computeStreak(streakRaw: number): string {
  if (streakRaw === 0) return "—";
  return streakRaw > 0 ? `W${streakRaw}` : `L${Math.abs(streakRaw)}`;
}

function computePoints(fpts: number = 0, fpts_decimal: number = 0): number {
  return fpts + fpts_decimal / 100;
}

function computeRank(rosters: SleeperRoster[], myRosterId: number): number {
  const sorted = [...rosters].sort((a, b) => {
    const aWins = a.settings?.wins ?? 0;
    const bWins = b.settings?.wins ?? 0;
    if (bWins !== aWins) return bWins - aWins;
    const aFpts = (a.settings?.fpts ?? 0) + (a.settings?.fpts_decimal ?? 0) / 100;
    const bFpts = (b.settings?.fpts ?? 0) + (b.settings?.fpts_decimal ?? 0) / 100;
    return bFpts - aFpts;
  });
  return sorted.findIndex((r) => r.roster_id === myRosterId) + 1;
}

function buildRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

// ─── Streak formatting ────────────────────────────────────────────────────────

describe("computeStreak", () => {
  it("returns — at season start (0)", () => {
    expect(computeStreak(0)).toBe("—");
  });

  it("formats a win streak", () => {
    expect(computeStreak(1)).toBe("W1");
    expect(computeStreak(3)).toBe("W3");
  });

  it("formats a loss streak (negative value from Sleeper)", () => {
    expect(computeStreak(-1)).toBe("L1");
    expect(computeStreak(-4)).toBe("L4");
  });
});

// ─── Points calculation ───────────────────────────────────────────────────────

describe("computePoints", () => {
  it("returns 0 for a fresh season", () => {
    expect(computePoints(0, 0)).toBe(0);
  });

  it("combines integer and decimal parts correctly", () => {
    expect(computePoints(1612, 40)).toBeCloseTo(1612.4);
  });

  it("handles fpts_decimal of 0 gracefully", () => {
    expect(computePoints(100, 0)).toBe(100);
  });

  it("handles missing arguments (defaults)", () => {
    expect(computePoints()).toBe(0);
  });

  it("is precise to two decimal places for common fantasy scores", () => {
    // 245 + 75/100 = 245.75
    expect(computePoints(245, 75)).toBeCloseTo(245.75, 5);
  });
});

// ─── Record string formatting ────────────────────────────────────────────────

describe("buildRecord", () => {
  it("shows 0-0 at season start", () => {
    expect(buildRecord(0, 0, 0)).toBe("0-0");
  });

  it("omits ties when there are none", () => {
    expect(buildRecord(8, 5, 0)).toBe("8-5");
  });

  it("includes ties when non-zero", () => {
    expect(buildRecord(7, 5, 1)).toBe("7-5-1");
  });
});

// ─── Rank calculation ────────────────────────────────────────────────────────

describe("computeRank", () => {
  const makeRoster = (
    roster_id: number,
    wins: number,
    fpts: number,
    fpts_decimal: number = 0
  ): SleeperRoster => ({
    roster_id,
    owner_id: `owner_${roster_id}`,
    settings: { wins, fpts, fpts_decimal },
  });

  it("all 0-0 at season start — ranked 1st by highest fpts (0.00 for all, first roster wins)", () => {
    const rosters = [
      makeRoster(1, 0, 0),
      makeRoster(2, 0, 0),
      makeRoster(3, 0, 0),
    ];
    // When all are equal, stable sort: first in array gets rank 1
    expect(computeRank(rosters, 1)).toBe(1);
    expect(computeRank(rosters, 2)).toBe(2);
    expect(computeRank(rosters, 3)).toBe(3);
  });

  it("sorts primarily by wins descending", () => {
    const rosters = [
      makeRoster(1, 3, 100),
      makeRoster(2, 5, 80),  // more wins, should be rank 1
      makeRoster(3, 4, 90),
    ];
    expect(computeRank(rosters, 2)).toBe(1);
    expect(computeRank(rosters, 3)).toBe(2);
    expect(computeRank(rosters, 1)).toBe(3);
  });

  it("uses fpts as tiebreaker when wins are equal", () => {
    const rosters = [
      makeRoster(1, 5, 1200, 50),  // 1200.50 fpts
      makeRoster(2, 5, 1350, 20),  // 1350.20 fpts — wins tiebreaker
      makeRoster(3, 5, 900, 0),    // 900.00 fpts
    ];
    expect(computeRank(rosters, 2)).toBe(1);
    expect(computeRank(rosters, 1)).toBe(2);
    expect(computeRank(rosters, 3)).toBe(3);
  });

  it("handles missing settings (treats as 0 wins, 0 fpts)", () => {
    const rosters: SleeperRoster[] = [
      { roster_id: 1, owner_id: "a", settings: { wins: 3, fpts: 100 } },
      { roster_id: 2, owner_id: "b" }, // no settings
    ];
    expect(computeRank(rosters, 1)).toBe(1);
    expect(computeRank(rosters, 2)).toBe(2);
  });

  it("does not mutate the original rosters array", () => {
    const rosters = [makeRoster(1, 2, 100), makeRoster(2, 5, 80)];
    const original = rosters.map((r) => r.roster_id);
    computeRank(rosters, 1);
    expect(rosters.map((r) => r.roster_id)).toEqual(original);
  });
});