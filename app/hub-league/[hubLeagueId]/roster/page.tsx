"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LeagueNav } from "../LeagueNav";
import { PlayerStatsModal } from "@/components/player/PlayerStatsModal"; 

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters?: string[];
};

export type SleeperPlayer = {
  player_id: string;
  full_name?: string | null;
  position?: string | null;
  team?: string | null;
};

type UserProfile = {
  id: number;
  clerkId: string;
  sleeperProfileId: string | null;
};


export default function LeaguePage() {
  const params = useParams();
  const { isLoaded, isSignedIn, user } = useUser();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [myRoster, setMyRoster] = useState<SleeperRoster | null>(null);
  const [player,   setPlayer]   = useState<{ [key: string]: SleeperPlayer }>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        setError("You must be signed in to view this league.");
        setLoading(false);
        return;
      }

      // hubLeagueId comes from the dynamic route segment [hubLeagueId]
      const hubLeagueId = params?.hubLeagueId;
      if (!hubLeagueId || typeof hubLeagueId !== "string") {
        setError("Invalid hub league id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Get HubLeagueSeason so we can read sleeperLeagueId
        const seasonRes = await fetch(`/api/hub-league-season/${hubLeagueId}`);
        if (!seasonRes.ok) {
          const txt = await seasonRes.text().catch(() => "");
          console.error("LeaguePage /api/hub-league-season failed:", txt);
          setError("Failed to load hub league season.");
          setLoading(false);
          return;
        }

        const seasonJson: any = await seasonRes.json();
        console.log("[LeaguePage] seasonJson:", seasonJson);
        console.log(
          "[LeaguePage] seasonJson keys:",
          seasonJson && typeof seasonJson === "object"
            ? Object.keys(seasonJson)
            : seasonJson
        );

        if (!seasonJson) {
          console.error(
            "[LeaguePage] Could not resolve hubLeagueSeason from seasonJson"
          );
          setError("Unexpected hub league season response from server.");
          setLoading(false);
          return;
        }

        console.log("hub league season:" + seasonJson.sleeperLeagueId)

        if (!seasonJson.sleeperLeagueId) {
          console.error(
            "[LeaguePage] No sleeperLeagueId on hubLeagueSeason:",
            seasonJson
          );
          setError("No Sleeper league linked to this hub league season.");
          setLoading(false);
          return;
        }

        const sleeperLeagueId = seasonJson.sleeperLeagueId;

        // 2) Load user profile -> sleeperProfileId
        const profileRes = await fetch("/api/profile", { method: "GET" });
        if (!profileRes.ok) {
          const txt = await profileRes.text().catch(() => "");
          console.error("LeaguePage /api/profile failed:", txt);
          setError("Failed to load user profile.");
          setLoading(false);
          return;
        }

        const profileJson = await profileRes.json();
        const userProfile: UserProfile | null =
          (profileJson && profileJson.profile) || (profileJson as UserProfile) || null;

        const sleeperProfileId = userProfile?.sleeperProfileId || null;

        if (!sleeperProfileId) {
          setError("Sleeper account not linked to this user.");
          setLoading(false);
          return;
        }

        // 3) Fetch live rosters from Sleeper via API route
        const rostersRes = await fetch(`/api/sleeper/rosters/${encodeURIComponent(sleeperLeagueId)}`);
        if (!rostersRes.ok) {
          const txt = await rostersRes.text().catch(() => "");
          console.error("LeaguePage /api/sleeper/rosters failed:", txt);
          setError("Failed to load rosters from Sleeper.");
          setLoading(false);
          return;
        }

        const rosters: SleeperRoster[] = await rostersRes.json();

        if (!Array.isArray(rosters) || rosters.length === 0) {
          setError("No rosters found for this league.");
          setLoading(false);
          return;
        }

        let userRoster = rosters.find((r) => r.owner_id === sleeperProfileId) ?? rosters[0];
        setMyRoster(userRoster);

        if (userRoster.players && userRoster.players.length > 0) {
          const ids = userRoster.players.join(",");
          const playersRes = await fetch(`/api/sleeper/players?ids=${encodeURIComponent(ids)}`);
          if (!playersRes.ok) {
            console.error("LeaguePage /api/sleeper/players failed:", playersRes.status);
            // Non-fatal: show roster IDs without names
            setPlayer({});
          } else {
            const playersData = await playersRes.json();
            setPlayer(playersData);
          }
        } else {
          setPlayer({});
        }
      } catch (err) {
        console.error("Error fetching league data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
  }, [isLoaded, isSignedIn, user, params]);

  const { starters, bench } = useMemo(() => {
    if (!myRoster?.players) {
      return { starters: [] as string[], bench: [] as string[] };
    }

    const startersArr = myRoster.starters ?? [];
    const startersSet = new Set(startersArr);

    const benchArr = myRoster.players.filter(
      (playerId) => !startersSet.has(playerId)
    );

    return { starters: startersArr, bench: benchArr };
  }, [myRoster]);

  const pageShell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 text-zinc-200">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) {
    return pageShell(
      <div className="mt-6 rounded-2xl border border-[#1d212b] bg-[#050609]/80 p-6">
        <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-zinc-800/80 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-zinc-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-red-400 mb-3">{error}</p>
        <button className="text-sm text-[#F4D06F] hover:underline" onClick={() => window.history.back()}>
          ← Go back
        </button>
      </div>
    );
  }

  const selectedPlayer =
    selectedPlayerId != null ? player[selectedPlayerId] ?? null : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 text-zinc-200">
        <LeagueNav />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 border border-zinc-700/70 px-3 py-1 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-300">
              Active League
            </span>
          </div>
        </div>
      </div>

      {!myRoster ? (
        <div className="rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-900/40 p-5 text-sm text-zinc-300">
          You do not have a roster in this league.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Starters card */}
          <section
            className="rounded-2xl bg-gradient-to-br from-[#10131d] via-[#090b12] to-black
                       border border-[#252a36] shadow-[0_0_25px_rgba(0,0,0,0.6)] p-4 md:p-5 mb-10"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#F4D06F]">
                  Starters
                </h3>
                <p className="text-xs text-zinc-400">
                  Your active lineup for this week.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                {starters.length} active
              </span>
            </div>
            {starters.length > 0 ? (
              <ul className="divide-y divide-zinc-800/80 text-sm">
                {starters.map((playerId) => {
                  const p = player[playerId];
                  const displayName = p?.full_name || p?.player_id || playerId;
                  return (
                    <li
                      key={playerId}
                      onClick={() => {
                        setSelectedPlayerId(playerId);
                        setIsStatsOpen(true);
                      }}
                      className="flex items-center justify-between py-2 hover:bg-zinc-900/40 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-zinc-400">
                          {p?.position && (
                            <span className="mr-2 font-semibold text-zinc-300">
                              {p.position}
                            </span>
                          )}
                          {p?.team && <span>{p.team}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">No starters found.</p>
            )}
          </section>

          {/* Bench card */}
          <section
            className="rounded-2xl bg-[#050609]/90 border border-[#1d212b]
                       shadow-[0_0_18px_rgba(0,0,0,0.5)] p-4 md:p-5 mb-10"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Bench
                </h3>
                <p className="text-xs text-zinc-400">
                  Depth pieces and future starters.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/40 text-zinc-200 border border-zinc-600/60">
                {bench.length} players
              </span>
            </div>
            {bench.length > 0 ? (
              <ul className="divide-y divide-zinc-800/80 text-sm">
                {bench.map((playerId) => {
                  const p = player[playerId];
                  const displayName = p?.full_name || p?.player_id || playerId;
                  return (
                    <li
                      key={playerId}
                      onClick={() => {
                        setSelectedPlayerId(playerId);
                        setIsStatsOpen(true);
                      }}
                      className="flex items-center justify-between py-2 hover:bg-zinc-900/40 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-zinc-400">
                          {p?.position && (
                            <span className="mr-2 font-semibold text-zinc-300">
                              {p.position}
                            </span>
                          )}
                          {p?.team && <span>{p.team}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">No bench players.</p>
            )}
          </section>
        </div>
      )}

      {/* Player stats modal */}
      <PlayerStatsModal
        open={isStatsOpen}
        player={selectedPlayer}
        onClose={() => {
          setIsStatsOpen(false);
          setSelectedPlayerId(null);
        }}
      />
      </div>
    </div>
  );
}
