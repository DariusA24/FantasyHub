import {
  winProbability,
  priceMatchup,
  isWeekLocked,
  wagerPayout,
} from "@/utils/bettingLines";

describe("winProbability", () => {
  it("gives 50% for an even matchup", () => {
    expect(winProbability(110, 110)).toBeCloseTo(0.5);
  });

  it("favors the higher projection", () => {
    const p = winProbability(125, 105);
    expect(p).toBeGreaterThan(0.6);
    expect(p).toBeLessThan(0.9);
  });

  it("is symmetric", () => {
    expect(winProbability(120, 100) + winProbability(100, 120)).toBeCloseTo(1);
  });
});

describe("priceMatchup", () => {
  it("prices an even matchup below 2x on both sides (house edge)", () => {
    const { homeOdds, awayOdds } = priceMatchup(110, 110);
    expect(homeOdds).toBe(awayOdds);
    expect(homeOdds).toBeLessThan(2);
    expect(homeOdds).toBeGreaterThan(1.8);
  });

  it("pays the underdog more than the favorite", () => {
    const { homeOdds, awayOdds } = priceMatchup(125, 100);
    expect(homeOdds).toBeLessThan(awayOdds);
  });

  it("keeps odds within sane bounds even for extreme mismatches", () => {
    const { homeOdds, awayOdds } = priceMatchup(180, 60);
    expect(homeOdds).toBeGreaterThanOrEqual(1.05);
    expect(awayOdds).toBeLessThanOrEqual(12);
  });

  it("sets the total to the combined projection rounded to 0.5", () => {
    expect(priceMatchup(110.3, 105.4).totalLine).toBe(215.5);
  });
});

describe("isWeekLocked", () => {
  it("is open Tuesday through Thursday (UTC) in the regular season", () => {
    expect(isWeekLocked("regular", new Date("2026-07-14T12:00:00Z"))).toBe(false); // Tue
    expect(isWeekLocked("regular", new Date("2026-07-15T12:00:00Z"))).toBe(false); // Wed
    expect(isWeekLocked("regular", new Date("2026-07-16T23:00:00Z"))).toBe(false); // Thu
  });

  it("locks Friday through Monday (UTC) while games are played", () => {
    expect(isWeekLocked("regular", new Date("2026-07-17T01:00:00Z"))).toBe(true); // Fri
    expect(isWeekLocked("regular", new Date("2026-07-19T18:00:00Z"))).toBe(true); // Sun
    expect(isWeekLocked("regular", new Date("2026-07-20T12:00:00Z"))).toBe(true); // Mon
  });

  it("never locks during the offseason or preseason", () => {
    expect(isWeekLocked("off", new Date("2026-07-17T01:00:00Z"))).toBe(false); // Fri
    expect(isWeekLocked("pre", new Date("2026-08-16T18:00:00Z"))).toBe(false); // Sun
  });
});

describe("wagerPayout", () => {
  it("floors stake times odds", () => {
    expect(wagerPayout(500, 1.38)).toBe(690);
    expect(wagerPayout(333, 1.9)).toBe(632);
  });
});
