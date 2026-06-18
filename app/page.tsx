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
import SleeperProfileCard from "@/components/ui/SleeperProfileCard";
import { LeagueGrid } from "@/components/ui/LeagueGrid";
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
};

type SleeperLeagues = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
  previous_league_id?: string | null;
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
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeagues | null>(
    null
  );
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isLeaguesLoading, setIsLeaguesLoading] = useState(false);
  const [recentHubLeague, setRecentHubLeague] = useState<{ id: string; name: string } | null>(null);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-300 shadow-[0_0_35px_rgba(0,0,0,0.7)] mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Loading your dashboard
        </div>
        <div className="text-lg font-semibold text-zinc-100 mb-2">
          Setting things up…
        </div>
        <div className="text-sm text-zinc-400 max-w-sm text-center">
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

  const handleLeagueClick = (league: SleeperLeagues) => {
    if (!league) return;
    setSelectedLeague(league);
    setIsLeagueModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 pt-10">
        {/* Top welcome + profile card */}
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
              Fantasy Overview
            </div>

            <div className="flex items-center gap-4">
              <div>
                <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
                  Welcome back, {user.firstName}
                </h1>
                <p className="mt-3 max-w-xl text-sm text-zinc-300 md:text-base">
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
                  className="relative h-14 w-14 rounded-full border border-zinc-700/80 bg-zinc-900 object-cover shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>
          </div>

          {hasSleeperLinked && (
            <div className="w-full max-w-xs self-stretch rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium">Linked Sleeper Account</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                  Active
                </span>
              </div>
              <SleeperProfileCard username={sleeperUsername} />
            </div>
          )}
        </div>

        {/* Recent hub league */}
        {recentHubLeague && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Recent League</p>
            <button
              onClick={() => router.push(`/hub-league/${recentHubLeague.id}`)}
              className="group flex w-full items-center justify-between rounded-2xl border border-zinc-800/60 bg-zinc-950/70 px-5 py-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition hover:border-[#F4D06F]/30 hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4D06F]/10 text-xl">
                  🏆
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-100 group-hover:text-white">{recentHubLeague.name}</p>
                  <p className="text-[11px] text-zinc-500">Hub League · Last visited</p>
                </div>
              </div>
              <FiArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-[#F4D06F] transition-colors" />
            </button>
          </div>
        )}

        {/* Stats row card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur">
          <StatsRow leaguesJoinedCount={leaguesJoinedCount} winRate={winRate} />
        </div>

        {/* Leagues header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4D06F]/10 text-[#F4D06F] ring-1 ring-[#F4D06F]/40">
                <span className="text-lg">🏈</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-50 md:text-2xl">
                  Your Leagues
                </h2>
                <p className="text-xs text-zinc-400 md:text-sm">
                  All Sleeper leagues linked to your account for this season.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="season-select"
                className="text-xs text-zinc-400 md:text-sm"
              >
                Season
              </label>
              <div className="relative">
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="h-8 rounded-full border border-zinc-700 bg-zinc-950/90 px-3 pr-8 text-xs text-zinc-100 shadow-sm outline-none ring-0 transition placeholder:text-zinc-500 focus:border-[#F4D06F]/70 focus:ring-2 focus:ring-[#F4D06F]/50 md:text-sm"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-zinc-400">
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leagues container */}
        <div
          className="mt-1 space-y-4 rounded-2xl border border-[#1d212b] bg-gradient-to-br from-[#05060a] via-[#090b12] to-[#05060a] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.85)]"
        >
          {isLeaguesLoading ? (
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="h-4 w-4 rounded-full border-2 border-zinc-700 border-t-[#F4D06F] animate-spin" />
              <span>Loading leagues for {selectedSeason}…</span>
            </div>
          ) : leaguesJoined && leaguesJoined.length > 0 ? (
            <LeagueGrid
              leagues={leaguesJoined}
              leagueRecords={leagueRecords}
              onLeagueClick={handleLeagueClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700/70 bg-zinc-950/60 px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900/80 ring-1 ring-zinc-700/80">
                <span className="text-xl text-zinc-400">📭</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100 md:text-lg">
                  No leagues found for {selectedSeason}
                </h3>
                <p className="mt-1 max-w-md text-xs text-zinc-400 md:text-sm">
                  Join or create a league on Sleeper, then refresh this page to
                  see it appear here. Make sure your Sleeper account is linked
                  to FantasyHub.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400">
                <span className="rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2 py-1">
                  Seasonal overview
                </span>
                <span className="rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2 py-1">
                  Cross-league records
                </span>
                <span className="rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2 py-1">
                  Win rate tracking
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sleeper modal & League modal */}
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

        <LeagueHubModal
          league={selectedLeague ?? null}
          isOpen={isLeagueModalOpen && !!selectedLeague}
          onClose={() => {
            setIsLeagueModalOpen(false);
            setSelectedLeague(null);
          }}
        />
      </div>
    </div>
  );
}

export default HomePage;
