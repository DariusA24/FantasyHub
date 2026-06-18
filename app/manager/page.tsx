"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getSleeperLeagues,
  getSleeperUserRecordForLeague,
  getLinkedSleeperProfileForUser,
} from "@/utils/sleeperActions";
import {
  FiAward,
  FiTrendingUp,
  FiUsers,
  FiShield,
  FiStar,
} from "react-icons/fi";

type UserProfile = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
  sleeperProfileId: string | null;
};

type League = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
};

type Record = { wins: number; losses: number; ties: number };

const SEASONS = ["2026", "2025", "2024", "2023"];

const MOCK_FAVE_PLAYERS = [
  { name: "Justin Jefferson", position: "WR", team: "MIN", drafts: 4 },
  { name: "CeeDee Lamb", position: "WR", team: "DAL", drafts: 3 },
  { name: "Bijan Robinson", position: "RB", team: "ATL", drafts: 2 },
];

export default function GMPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sleeperUsername, setSleeperUsername] = useState<string>("");
  const [allLeagues, setAllLeagues] = useState<{ league: League; record: Record }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      const p: UserProfile = data.profile;
      if (!p) { router.push("/profile/create"); return; }
      setProfile(p);

      if (p.sleeperProfileId) {
        try {
          const linked = await getLinkedSleeperProfileForUser();
          setSleeperUsername(
            typeof linked === "string" ? linked : linked?.username || linked?.display_name || ""
          );
        } catch { /* non-fatal */ }

        // Fetch all leagues across seasons in parallel
        const leaguesBySeasonResults = await Promise.allSettled(
          SEASONS.map((s) => getSleeperLeagues(p.sleeperProfileId!, s))
        );

        const combined: League[] = [];
        for (const result of leaguesBySeasonResults) {
          if (result.status === "fulfilled") combined.push(...result.value);
        }

        // Dedupe by league_id
        const seen = new Set<string>();
        const unique = combined.filter((l) => {
          if (seen.has(l.league_id)) return false;
          seen.add(l.league_id);
          return true;
        });

        // Fetch records in parallel
        const withRecords = await Promise.all(
          unique.map(async (league) => {
            try {
              const record = await getSleeperUserRecordForLeague(league.league_id, p.sleeperProfileId!);
              return { league, record };
            } catch {
              return { league, record: { wins: 0, losses: 0, ties: 0 } };
            }
          })
        );

        setAllLeagues(withRecords);
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308] px-4 pt-10 pb-24">
        <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-zinc-800/50" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-800/40" />)}
          </div>
          <div className="h-64 rounded-2xl bg-zinc-800/30" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308] p-6 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!isSignedIn || !profile) return null;

  // Career stats
  const totalWins = allLeagues.reduce((s, l) => s + l.record.wins, 0);
  const totalLosses = allLeagues.reduce((s, l) => s + l.record.losses, 0);
  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const totalLeagues = allLeagues.length;

  const statCards = [
    { label: "Leagues Played", value: totalLeagues, icon: FiUsers, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Career Wins", value: totalWins, icon: FiAward, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Career Losses", value: totalLosses, icon: FiShield, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Win Rate", value: `${winRate}%`, icon: FiTrendingUp, color: "text-[#F4D06F]", bg: "bg-[#F4D06F]/10" },
  ];

  // Group leagues by season for display
  const bySeason = allLeagues.reduce<Record<string, typeof allLeagues>>((acc, item) => {
    const s = item.league.season;
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
  const sortedSeasons = Object.keys(bySeason).sort((a, b) => Number(b) - Number(a));

  const profileImageUrl = profile.profileImage || user.imageUrl || "/default-profile.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">

        {/* ─── Hero ─────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0d0f1a] to-[#050609] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#F4D06F]/20 blur-xl" />
                <Image
                  src={profileImageUrl}
                  alt={profile.firstName}
                  width={72}
                  height={72}
                  className="relative h-16 w-16 rounded-full border border-zinc-700 object-cover shadow-xl"
                />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                  <FiStar className="h-3 w-3 text-[#F4D06F]" />
                  GM Profile
                </div>
                <h1 className="text-2xl font-extrabold text-zinc-100 md:text-3xl">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-sm text-zinc-400">
                  @{profile.username}
                  {sleeperUsername && (
                    <span className="ml-2 text-zinc-600">· Sleeper: <span className="text-zinc-400">{sleeperUsername}</span></span>
                  )}
                </p>
              </div>
            </div>

            {/* Win rate ring */}
            <div className="shrink-0 text-center">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Career Win Rate</p>
              <p className="text-4xl font-black text-[#F4D06F]">{winRate}%</p>
              <p className="text-xs text-zinc-500 mt-0.5">{totalWins}W – {totalLosses}L</p>
            </div>
          </div>
        </div>

        {/* ─── Stat Cards ───────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-4 flex flex-col gap-2"
              >
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-black text-zinc-100">{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* ─── Favorite Drafted Players ─────────────────── */}
        <section className="mb-8 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Most Drafted Players</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Players you keep coming back to</p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-400">
              Coming Soon
            </span>
          </div>
          <ul className="space-y-2">
            {MOCK_FAVE_PLAYERS.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-3 py-2.5"
              >
                <span className={`shrink-0 text-sm font-black w-5 text-center ${i === 0 ? "text-[#F4D06F]" : "text-zinc-600"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100">{p.name}</p>
                  <p className="text-[11px] text-zinc-500">{p.position} · {p.team}</p>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Drafted <span className="text-zinc-300 font-semibold">{p.drafts}x</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[10px] text-zinc-700 italic">
            Will auto-populate once draft history is tracked
          </p>
        </section>

        {/* ─── League History ───────────────────────────── */}
        <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">League History</h2>

          {sortedSeasons.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No league history found. Link your Sleeper account on the home page.</p>
          ) : (
            <div className="space-y-5">
              {sortedSeasons.map((season) => {
                const leagues = bySeason[season];
                const seasonWins = leagues.reduce((s, l) => s + l.record.wins, 0);
                const seasonLosses = leagues.reduce((s, l) => s + l.record.losses, 0);
                return (
                  <div key={season}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">{season}</span>
                      <span className="h-px flex-1 bg-zinc-800" />
                      <span className="text-[10px] text-zinc-600">{seasonWins}W – {seasonLosses}L across {leagues.length} league{leagues.length !== 1 ? "s" : ""}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {leagues.map(({ league, record }) => {
                        const gp = record.wins + record.losses;
                        const wr = gp > 0 ? Math.round((record.wins / gp) * 100) : 0;
                        return (
                          <li
                            key={league.league_id}
                            className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-3 py-2.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-100 truncate">{league.name}</p>
                              <p className="text-[11px] text-zinc-500 uppercase">{league.sport}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-zinc-200">
                                {record.wins}–{record.losses}{record.ties > 0 ? `–${record.ties}` : ""}
                              </p>
                              <p className={`text-[10px] ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                                {wr}% win
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
