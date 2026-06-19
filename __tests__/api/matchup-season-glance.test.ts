/**
 * Integration tests for the Season at a Glance data returned by the matchup API route.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

// ─── Mock dependencies ────────────────────────────────────────────────────────

jest.mock("@/utils/actions", () => ({
  getAuthUser: jest.fn(),
}));

jest.mock("@/utils/db", () => ({
  prisma: {
    profile: { findUnique: jest.fn() },
    hubLeague: { findUnique: jest.fn() },
  },
}));

jest.mock("@/utils/sleeperActions", () => ({
  getSleeperMatchups: jest.fn(),
}));

import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { getSleeperMatchups } from "@/utils/sleeperActions";
import { GET } from "@/app/api/hub-leagues/[hubLeagueId]/matchup/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const HUB_LEAGUE_ID = "hub-123";
const SLEEPER_LEAGUE_ID = "sleeper-456";
const MY_SLEEPER_ID = "user-me";
const MY_ROSTER_ID = 1;

const mockCtx = {
  params: { hubLeagueId: HUB_LEAGUE_ID },
};

function makeRequest() {
  return new NextRequest(`http://localhost/api/hub-leagues/${HUB_LEAGUE_ID}/matchup`);
}

// Rosters returned by Sleeper
function makeRosters(overrides: Partial<{
  wins: number; losses: number; ties: number;
  fpts: number; fpts_decimal: number;
  fpts_against: number; fpts_against_decimal: number;
  streak: number;
}> = {}) {
  const {
    wins = 0, losses = 0, ties = 0,
    fpts = 0, fpts_decimal = 0,
    fpts_against = 0, fpts_against_decimal = 0,
    streak = 0,
  } = overrides;

  return [
    {
      roster_id: MY_ROSTER_ID,
      owner_id: MY_SLEEPER_ID,
      matchup_id: 10,
      points: 0,
      starters: [],
      settings: { wins, losses, ties, fpts, fpts_decimal, fpts_against, fpts_against_decimal, streak },
    },
    {
      roster_id: 2,
      owner_id: "user-opp",
      matchup_id: 10,
      points: 0,
      starters: [],
      settings: { wins: 0, losses: 0, ties: 0, fpts: 0, fpts_decimal: 0, fpts_against: 0, fpts_against_decimal: 0, streak: 0 },
    },
  ];
}

function mockFetch(stateOverride: Partial<{ week: number; season: string; season_type: string }> = {}, rosters = makeRosters()) {
  const state = { week: 1, season: "2025", season_type: "regular", ...stateOverride };

  (global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
    if (url.includes("/state/nfl")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(state) });
    }
    if (url.includes("/rosters")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rosters) });
    }
    if (url.includes("/users")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { user_id: MY_SLEEPER_ID, display_name: "Me", is_owner: false },
          { user_id: "user-opp", display_name: "Opponent", is_owner: true },
        ]),
      });
    }
    if (url.includes(`/league/${SLEEPER_LEAGUE_ID}`) && !url.includes("/rosters") && !url.includes("/users")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ scoring_settings: { rec: 1 } }) });
    }
    if (url.includes("/projections/")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

function setupAuth() {
  (getAuthUser as jest.Mock).mockResolvedValue({ id: "clerk-user-1" });
  (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ sleeperProfileId: MY_SLEEPER_ID });
  (prisma.hubLeague.findUnique as jest.Mock).mockResolvedValue({
    seasons: [{ sleeperLeagueId: SLEEPER_LEAGUE_ID }],
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/hub-leagues/[hubLeagueId]/matchup — seasonGlance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    (getSleeperMatchups as jest.Mock).mockResolvedValue([
      { roster_id: MY_ROSTER_ID, matchup_id: 10, points: 0, starters: [] },
      { roster_id: 2, matchup_id: 10, points: 0, starters: [] },
    ]);
  });

  it("returns 0-0 record and rank at season start", async () => {
    mockFetch();

    const res = await GET(makeRequest(), mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.seasonGlance).toEqual({
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: "—",
      rank: expect.any(Number),
    });
  });

  it("formats a win streak correctly", async () => {
    mockFetch({}, makeRosters({ wins: 3, losses: 1, streak: 3 }));

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.streak).toBe("W3");
    expect(seasonGlance.wins).toBe(3);
    expect(seasonGlance.losses).toBe(1);
  });

  it("formats a loss streak correctly", async () => {
    mockFetch({}, makeRosters({ wins: 1, losses: 3, streak: -2 }));

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.streak).toBe("L2");
  });

  it("calculates pointsFor with fpts_decimal", async () => {
    mockFetch({}, makeRosters({ fpts: 1612, fpts_decimal: 40 }));

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.pointsFor).toBeCloseTo(1612.4);
  });

  it("calculates pointsAgainst with fpts_against_decimal", async () => {
    mockFetch({}, makeRosters({ fpts_against: 1490, fpts_against_decimal: 80 }));

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.pointsAgainst).toBeCloseTo(1490.8);
  });

  it("ranks user 1st when they have the most wins", async () => {
    const rosters = [
      {
        roster_id: MY_ROSTER_ID, owner_id: MY_SLEEPER_ID, matchup_id: 10, points: 0, starters: [],
        settings: { wins: 5, losses: 2, fpts: 900, fpts_decimal: 0 },
      },
      {
        roster_id: 2, owner_id: "user-opp", matchup_id: 10, points: 0, starters: [],
        settings: { wins: 3, losses: 4, fpts: 1100, fpts_decimal: 0 },
      },
    ];
    mockFetch({}, rosters as any);

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.rank).toBe(1);
  });

  it("uses fpts as tiebreaker when wins are equal", async () => {
    const rosters = [
      {
        roster_id: MY_ROSTER_ID, owner_id: MY_SLEEPER_ID, matchup_id: 10, points: 0, starters: [],
        settings: { wins: 4, losses: 3, fpts: 900, fpts_decimal: 0 },  // lower fpts → rank 2
      },
      {
        roster_id: 2, owner_id: "user-opp", matchup_id: 10, points: 0, starters: [],
        settings: { wins: 4, losses: 3, fpts: 1100, fpts_decimal: 0 }, // higher fpts → rank 1
      },
    ];
    mockFetch({}, rosters as any);

    const res = await GET(makeRequest(), mockCtx as any);
    const { seasonGlance } = await res.json();

    expect(seasonGlance.rank).toBe(2);
  });

  it("includes seasonGlance even when there is no matchup for the user", async () => {
    // getSleeperMatchups returns matchups that don't include user's roster
    (getSleeperMatchups as jest.Mock).mockResolvedValue([
      { roster_id: 99, matchup_id: 5, points: 0, starters: [] },
    ]);
    mockFetch();

    const res = await GET(makeRequest(), mockCtx as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matchup).toBeNull();
    expect(body.seasonGlance).toBeDefined();
    expect(body.seasonGlance.wins).toBe(0);
  });

  it("returns 401 when user is not authenticated", async () => {
    (getAuthUser as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest(), mockCtx as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no Sleeper account is linked", async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ sleeperProfileId: null });
    mockFetch();

    const res = await GET(makeRequest(), mockCtx as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user is not a member of the Sleeper league", async () => {
    // Rosters have a different owner_id than the user's Sleeper ID
    const rosters = [
      { roster_id: 1, owner_id: "someone-else", matchup_id: 1, points: 0, starters: [], settings: {} },
    ];
    mockFetch({}, rosters as any);

    const res = await GET(makeRequest(), mockCtx as any);
    expect(res.status).toBe(404);
  });
});