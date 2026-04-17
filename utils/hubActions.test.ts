import {
  fetchHubLeaguesForSleeperLeague,
  createHubLeagueForSleeperLeague,
  joinHubLeague,
  type SleeperLeague,
} from "./hubActions";
import { mockFetchOnce } from "../tests/test-utils/mockFetch";
import { describe, it } from "@jest/globals";
import { expect } from "@jest/globals";

describe("hubActions.fetchHubLeaguesForSleeperLeague", () => {
  it("normalizes hubLeagueSeasons shape", async () => {
    mockFetchOnce({
      json: {
        hubLeagueSeasons: [
          {
            hubLeague: {
              id: 1,
              name: "My Hub",
              description: "desc",
              isMember: true,
              owner: { username: "owner1" },
            },
          },
        ],
      },
    });

    const result = await fetchHubLeaguesForSleeperLeague("123");
    expect(result).toEqual([
      {
        id: "1",
        name: "My Hub",
        description: "desc",
        isMember: true,
        ownerUsername: "owner1",
      },
    ]);
  });

  it("throws on non-OK status", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: "Internal error",
    });

    await expect(fetchHubLeaguesForSleeperLeague("123")).rejects.toThrow(
      /Internal error|HTTP 500/
    );
  });

  it("handles hubLeagues array shape", async () => {
    mockFetchOnce({
      json: {
        hubLeagues: [
          {
            id: "abc",
            name: "Other Hub",
            description: null,
            is_member: false,
            ownerUsername: "user2",
          },
        ],
      },
    });

    const result = await fetchHubLeaguesForSleeperLeague("123");
    expect(result[0]).toMatchObject({
      id: "abc",
      name: "Other Hub",
      isMember: false,
      ownerUsername: "user2",
    });
  });
});

describe("hubActions.createHubLeagueForSleeperLeague", () => {
  it("returns created hub league from API", async () => {
    const league: SleeperLeague = {
      league_id: "l1",
      name: "Sleeper League",
      season: "2024",
      sport: "nfl",
      avatar: null,
    };

    mockFetchOnce({
      json: {
        hubLeague: {
          id: "hub1",
          name: "Sleeper League Hub",
          description: "Created hub",
        },
      },
    });

    const created = await createHubLeagueForSleeperLeague(league);
    expect(created).toMatchObject({
      id: "hub1",
      name: "Sleeper League Hub",
    });
  });
});

describe("hubActions.joinHubLeague", () => {
  it("throws on 401", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: "Unauthorized",
    });

    await expect(joinHubLeague("hub1")).rejects.toThrow(/signed in/i);
  });

  it("throws on other non-OK", async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: "Bad request",
    });

    await expect(joinHubLeague("hub1")).rejects.toThrow(/Bad request|Failed to join/);
  });

  it("resolves on OK", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: "",
    });

    await expect(joinHubLeague("hub1")).resolves.toBeUndefined();
  });
});



