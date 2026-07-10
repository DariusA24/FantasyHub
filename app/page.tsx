"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Guest from "../components/Guest";
import SleeperSearchModal from "../components/ui/SleeperSearchModal";
import {
  searchSleeperProfile,
  getLinkedSleeperProfileForUser,
  getSleeperLeagues,
  getSleeperUserRecordForLeague,
} from "../utils/sleeperActions";
import { sleeperProfile } from "@prisma/client";
import { LeagueCard } from "@/components/ui/LeagueCard";
import StatsRow from "@/components/ui/StatRow";
import Image from "next/image";
import { LeagueHubModal } from "@/components/ui/LeagueHubModal";
import { useRouter } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";


type UserProfile = {
  id: number;
  clerkId: string;
  sleeperProfileId: string | null;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
  sleeperProfile?: sleeperProfile | null;
  hasEspnCredentials?: boolean;
};

type SleeperLeagues = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
  previous_league_id?: string | null;
  total_rosters?: number;
  status?: string;
};

function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sleeperUsername, setSleeperUsername] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [leaguesJoinedCount, setLeaguesJoinedCount] = useState<number>(0);
  const [leaguesJoined, setLeaguesJoined] = useState<SleeperLeagues[] | null>(
    null
  );
  const [leagueRecords, setLeagueRecords] = useState<
    Record<string, { wins: number; losses: number; ties: number }>
  >({});
  const [selectedSeason, setSelectedSeason] = useState<string>("2026");
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeagues | null>(null);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isLeaguesLoading, setIsLeaguesLoading] = useState(false);
  const [recentHubLeague, setRecentHubLeague] = useState<{ id: string; name: string } | null>(null);
  const [hubRank, setHubRank] = useState<{ tier: string; score: number | null; seasons: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_espnLeagues, _setEspnLeagues] = useState<{ id: string; leagueId: string; season: string; name: string | null; teamCount: number | null }[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { method: "GET" });
      if (!res.ok) {
        console.error("Failed to fetch profile:", await res.text());
        setUserProfile(null);
        setSleeperUsername("");
        setLeaguesJoined(null);
        setShowModal(false);
        return;
      }

      const data = await res.json();
      console.log("HomePage /api/profile raw:", data);
      const fetchedProfile: UserProfile | null = data.profile ?? null;
      console.log("HomePage parsed userProfile:", fetchedProfile);

      if (!fetchedProfile) {
        console.log("No UserProfile found, redirecting to /profile/create");
        setUserProfile(null);
        setSleeperUsername("");
        setLeaguesJoined(null);
        setLeaguesJoinedCount(0);
        setLeagueRecords({});
        setShowModal(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("sleeperProfileCache");
        }
        router.push("/profile/create");
        return;
      }

      if ((fetchedProfile as any).needsSetup) {
        console.log("UserProfile needs setup, redirecting to /profile/create");
        router.push("/profile/create");
        return;
      }

      setUserProfile(fetchedProfile);

      console.log(
        "sleeperProfileId from fetchedProfile:",
        fetchedProfile.sleeperProfileId
      );

      const hasSleeperLinked =
        fetchedProfile.sleeperProfileId !== null &&
        fetchedProfile.sleeperProfileId !== undefined;

      // ESPN leagues hidden for MVP — fetch skipped
      // fetch('/api/espn/leagues')
      //   .then((r) => r.ok ? r.json() : null)
      //   .then((data) => { if (data?.leagues) setEspnLeagues(data.leagues); })
      //   .catch(() => {});

      if (!hasSleeperLinked) {
        console.log("No Sleeper linked; opening SleeperSearchModal");
        setSleeperUsername("");
        setLeaguesJoinedCount(0);
        setShowModal(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("sleeperProfileCache");
        }
        return;
      }

      console.log(
        "Sleeper Profile ID (linked):",
        fetchedProfile.sleeperProfileId
      );

      // Fetch LeagueShelf rank (cross-league, non-blocking)
      fetch(`/api/profile/rank?sleeperUserId=${fetchedProfile.sleeperProfileId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.tier) setHubRank(data); })
        .catch(() => {});

      try {
        if (fetchedProfile.sleeperProfileId) {
          const sleeper = await searchSleeperProfile(
            fetchedProfile.sleeperProfileId
          );
          console.log("Sleeper profile lookup result:", sleeper);
        }
      } catch (e) {
        console.error("Error searching sleeper profile:", e);
      }

      let cachedDisplayName = "";
      let needFetchFromServer = true;

      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("sleeperProfileCache");
        if (raw) {
          try {
            const cached = JSON.parse(raw) as {
              sleeperProfileId: string;
              username: string;
              profile: any;
            };
            if (cached.sleeperProfileId === fetchedProfile.sleeperProfileId) {
              cachedDisplayName = cached.username;
              needFetchFromServer = false;
              console.log("Using cached Sleeper profile from localStorage");
            }
          } catch (err) {
            console.warn("Failed to parse sleeperProfileCache:", err);
            localStorage.removeItem("sleeperProfileCache");
          }
        }
      }

      if (!needFetchFromServer) {
        setSleeperUsername(cachedDisplayName);
      } else {
        try {
          const linkedSleeper = await getLinkedSleeperProfileForUser();
          const displayName =
            typeof linkedSleeper === "string"
              ? linkedSleeper
              : linkedSleeper?.username || linkedSleeper?.display_name || "";

          setSleeperUsername(displayName);

          if (typeof window !== "undefined") {
            const cachePayload = {
              sleeperProfileId: fetchedProfile.sleeperProfileId,
              username: displayName,
              profile: linkedSleeper,
            };
            localStorage.setItem(
              "sleeperProfileCache",
              JSON.stringify(cachePayload)
            );
          }
        } catch (e) {
          console.error("Error fetching linked Sleeper profile for user:", e);
          setSleeperUsername("");
        }
      }

      try {
        setIsLeaguesLoading(true);
        const result: SleeperLeagues[] = await getSleeperLeagues(
          fetchedProfile.sleeperProfileId!,
          selectedSeason
        );
        setLeaguesJoined(result);
        setLeaguesJoinedCount(result.length);

        const records: Record<
          string,
          { wins: number; losses: number; ties: number }
        > = {};

        await Promise.all(
          result.map(async (lg) => {
            try {
              const rec = await getSleeperUserRecordForLeague(
                lg.league_id,
                fetchedProfile.sleeperProfileId!
              );
              records[lg.league_id] = {
                wins: rec?.wins ?? 0,
                losses: rec?.losses ?? 0,
                ties: rec?.ties ?? 0,
              };
            } catch (err) {
              console.error(
                "Error fetching record for league",
                lg.league_id,
                err
              );
              records[lg.league_id] = { wins: 0, losses: 0, ties: 0 };
            }
          })
        );
        setLeagueRecords(records);
      } catch (e) {
        console.error("Error fetching Sleeper league count or records:", e);
        setLeaguesJoined(null);
        setLeaguesJoinedCount(0);
        setLeagueRecords({});
      } finally {
        setIsLeaguesLoading(false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [router, selectedSeason]);

  useEffect(() => {
    if (isSignedIn) {
      loadProfile();
    } else {
      setUserProfile(null);
      setSleeperUsername("");
      setLeaguesJoinedCount(0);
      setLeaguesJoined(null);
      setLeagueRecords({});
      setShowModal(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("sleeperProfileCache");
      }
    }
  }, [isSignedIn, loadProfile]);

  useEffect(() => {
    console.log("useEffect triggered. showModal:", showModal);
  }, [showModal]);

  useEffect(() => {
    const raw = localStorage.getItem("recentHubLeague");
    if (raw) {
      try { setRecentHubLeague(JSON.parse(raw)); } catch {}
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#05060a]">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-sm dark:shadow-[0_0_35px_rgba(0,0,0,0.7)] mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Loading your dashboard
        </div>
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Setting things up…
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm text-center">
          If this takes too long, there might be an issue with authentication.
        </div>
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_0_30px_rgba(244,208,111,0.3)] transition hover:bg-[#f7da8b]"
          onClick={() => window.location.reload()}
        >
          <span className="h-4 w-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
          Retry
        </button>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Guest />;
  }

  const hasSleeperLinked = !!userProfile?.sleeperProfileId;

  const profileImageUrl =
    userProfile?.profileImage ||
    user.imageUrl ||
    "/default-profile.png";

  const { totalWins, totalLosses } = Object.values(leagueRecords).reduce(
    (acc, rec) => {
      acc.totalWins += rec.wins;
      acc.totalLosses += rec.losses;
      return acc;
    },
    { totalWins: 0, totalLosses: 0 }
  );

  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 pt-10">
        {/* Top welcome + profile card */}
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
              Fantasy Overview
            </div>

            <div className="flex items-center gap-4">
              <div>
                <h1 className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-[#F4D06F] dark:via-[#f9f0c2] dark:to-[#F4D06F] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
                  Welcome back, {user.firstName}
                </h1>
                <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-300 md:text-base">
                  Your cross-league Sleeper dashboard. Track performance,
                  monitor win rate, and jump into any league with a single tap.
                </p>
              </div>
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#F4D06F]/25 blur-xl" />
                <Image
                  src={profileImageUrl}
                  alt={`${user.firstName}'s profile`}
                  width={60}
                  height={60}
                  className="relative h-14 w-14 rounded-full border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 object-cover shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs self-stretch rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 p-4 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Platform Connections
            </p>
            <ul className="space-y-2.5">

              {/* Sleeper */}
              <li className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  SLP
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Sleeper</p>
                  {hasSleeperLinked && sleeperUsername ? (
                    <p className="text-[11px] text-zinc-500 truncate">@{sleeperUsername}</p>
                  ) : (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic">Not linked</p>
                  )}
                </div>
                {hasSleeperLinked && sleeperUsername ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-600">
                    ——
                  </span>
                )}
              </li>

              <li className="h-px bg-zinc-100 dark:bg-zinc-800/60" />

              {/* ESPN — coming soon */}
              <li className="flex items-center gap-3 opacity-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[10px] font-black text-red-600 dark:text-red-400">
                  ESPN
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">ESPN</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Coming soon</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-600">
                  ——
                </span>
              </li>

              <li className="h-px bg-zinc-100 dark:bg-zinc-800/60" />

              {/* Yahoo — coming soon */}
              <li className="flex items-center gap-3 opacity-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-[10px] font-black text-purple-600 dark:text-purple-400">
                  YHO
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Yahoo</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Coming soon</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-600">
                  ——
                </span>
              </li>

            </ul>
          </div>
        </div>

        {/* Recent hub league */}
        {recentHubLeague && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Recent League</p>
            <button
              onClick={() => router.push(`/hub-league/${recentHubLeague.id}`)}
              className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/70 px-5 py-4 text-left shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition hover:border-amber-400/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4D06F]/10 text-xl">
                  🏆
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white">{recentHubLeague.name}</p>
                  <p className="text-[11px] text-zinc-500">Hub League · Last visited</p>
                </div>
              </div>
              <FiArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:text-amber-500 dark:group-hover:text-[#F4D06F] transition-colors" />
            </button>
          </div>
        )}

        {/* Stats row card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 p-4 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur">
          <StatsRow
            leaguesJoinedCount={leaguesJoinedCount}
            winRate={winRate}
            leagueShelfRank={hubRank && hubRank.tier !== "Unranked" ? hubRank.tier : undefined}
          />
        </div>

        {/* Leagues header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4D06F]/10 text-[#F4D06F] ring-1 ring-[#F4D06F]/40">
                <span className="text-lg">🏈</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 md:text-2xl">
                  Your Leagues
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
                  Your Sleeper leagues.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="season-select"
                className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm"
              >
                Season
              </label>
              <div className="relative">
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="h-8 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950/90 px-3 pr-8 text-xs text-zinc-800 dark:text-zinc-100 shadow-sm outline-none ring-0 transition focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30 md:text-sm"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-zinc-500">
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leagues container */}
        <div className="mt-1 rounded-2xl border border-zinc-200 dark:border-[#1d212b] bg-white dark:bg-[#05060a] p-6 shadow-sm dark:shadow-[0_22px_60px_rgba(0,0,0,0.85)]">
          {isLeaguesLoading ? (
            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 dark:border-t-[#F4D06F] animate-spin" />
              <span>Loading leagues…</span>
            </div>
          ) : (leaguesJoined && leaguesJoined.length > 0) ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(leaguesJoined ?? []).map((league) => {
                const record = leagueRecords[league.league_id];
                return (
                  <LeagueCard
                    key={league.league_id}
                    league_id={league.league_id}
                    name={league.name}
                    season={league.season}
                    sport={league.sport}
                    photo={league.avatar}
                    status={league.status}
                    total_rosters={league.total_rosters}
                    record={record ? `${record.wins}-${record.losses}-${record.ties}` : undefined}
                    platform="sleeper"
                    onClick={() => {
                      setSelectedLeague(league);
                      setIsLeagueModalOpen(true);
                    }}
                  />
                );
              })}
              {/* ESPN league cards — hidden for MVP */}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700/70 bg-zinc-50 dark:bg-zinc-950/60 px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 ring-1 ring-zinc-200 dark:ring-zinc-700/80">
                <span className="text-xl">📭</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 md:text-lg">
                  No leagues found for {selectedSeason}
                </h3>
                <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
                  Join or create a league on Sleeper to get started.
                </p>
              </div>
            </div>
          )}
        </div>

        <LeagueHubModal
          league={selectedLeague}
          isOpen={isLeagueModalOpen && !!selectedLeague}
          onClose={() => { setIsLeagueModalOpen(false); setSelectedLeague(null); }}
        />

        {/* Sleeper modal */}
        {!hasSleeperLinked && (
          <SleeperSearchModal
            isOpen={showModal}
            onClose={async () => {
              setShowModal(false);
              if (typeof window !== "undefined") {
                localStorage.removeItem("sleeperProfileCache");
              }
              await loadProfile();
            }}
          />
        )}

      </div>
    </div>
  );
}

export default HomePage;
