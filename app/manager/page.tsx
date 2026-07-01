"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

type UserProfile = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
  bio: string | null;
  sleeperProfileId: string | null;
};

type League = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  avatar: string | null;
};

type LeagueRecord = { wins: number; losses: number; ties: number };

const SEASONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017"];

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
  const [allLeagues, setAllLeagues] = useState<{ league: League; record: LeagueRecord }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editPhoto, setEditPhoto] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ESPN
  type EspnLeagueRow = { id: string; leagueId: string; season: string; name: string | null; teamCount: number | null };
  const [espnLeagues, setEspnLeagues]   = useState<EspnLeagueRow[]>([]);
  const [espnLeagueId, setEspnLeagueId] = useState("");
  const [espnSeason, setEspnSeason]     = useState(new Date().getFullYear().toString());
  const [espnAdding, setEspnAdding]     = useState(false);
  const [espnError, setEspnError]       = useState<string | null>(null);

  const hasFetched = useRef(false);
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  const loadEspnLeagues = useCallback(async () => {
    const res = await fetch("/api/espn/leagues");
    if (res.ok) {
      const data = await res.json();
      setEspnLeagues(data.leagues ?? []);
    }
  }, []);

  const addEspnLeague = async () => {
    if (!espnLeagueId.trim()) return;
    setEspnAdding(true);
    setEspnError(null);
    try {
      const res = await fetch("/api/espn/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: espnLeagueId.trim(), season: espnSeason }),
      });
      const data = await res.json();
      if (!res.ok) { setEspnError(data.error ?? "Failed to add league"); return; }
      setEspnLeagues((prev) => [...prev, data.league]);
      setEspnLeagueId("");
    } catch {
      setEspnError("Could not reach ESPN — check the league ID");
    } finally {
      setEspnAdding(false);
    }
  };

  const removeEspnLeague = async (leagueId: string, season: string) => {
    await fetch("/api/espn/leagues", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId, season }),
    });
    setEspnLeagues((prev) => prev.filter((l) => !(l.leagueId === leagueId && l.season === season)));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      const p: UserProfile = data.profile;
      if (!p) { routerRef.current.push("/profile/create"); return; }
      setProfile(p);

      if (p.sleeperProfileId) {
        const [linkedResult, ...leaguesBySeasonResults] = await Promise.allSettled([
          getLinkedSleeperProfileForUser(),
          ...SEASONS.map((s) => getSleeperLeagues(p.sleeperProfileId!, s)),
        ]);

        if (linkedResult.status === "fulfilled" && linkedResult.value) {
          const linked = linkedResult.value;
          setSleeperUsername(
            typeof linked === "string" ? linked : linked?.username || linked?.display_name || ""
          );
        }

        const combined: League[] = [];
        for (const result of leaguesBySeasonResults) {
          if (result.status === "fulfilled") combined.push(...result.value);
        }

        const seen = new Set<string>();
        const unique = combined.filter((l) => {
          if (seen.has(l.league_id)) return false;
          seen.add(l.league_id);
          return true;
        });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && !hasFetched.current) {
      hasFetched.current = true;
      load();
      loadEspnLeagues();
    }
  }, [isLoaded, isSignedIn, load, loadEspnLeagues]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] px-4 pt-10 pb-24">
        <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800/50" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800/40" />)}
          </div>
          <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800/30" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] p-6 text-red-500 dark:text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!isSignedIn || !profile) return null;

  const totalWins = allLeagues.reduce((s, l) => s + l.record.wins, 0);
  const totalLosses = allLeagues.reduce((s, l) => s + l.record.losses, 0);
  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const totalLeagues = allLeagues.length;

  const statCards = [
    { label: "Leagues Played", value: totalLeagues, icon: FiUsers,     color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10" },
    { label: "Career Wins",    value: totalWins,    icon: FiAward,     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Career Losses",  value: totalLosses,  icon: FiShield,    color: "text-red-600 dark:text-red-400",         bg: "bg-red-500/10" },
    { label: "Win Rate",       value: `${winRate}%`,icon: FiTrendingUp, color: "text-amber-600 dark:text-[#F4D06F]",    bg: "bg-amber-500/10 dark:bg-[#F4D06F]/10" },
  ];

  const bySeason = allLeagues.reduce<{ [key: string]: typeof allLeagues }>((acc, item) => {
    const s = item.league.season;
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});
  const sortedSeasons = Object.keys(bySeason).sort((a, b) => Number(b) - Number(a));

  const profileImageUrl = editing
    ? (editPhoto || user.imageUrl || "/default-profile.png")
    : (profile.profileImage || user.imageUrl || "/default-profile.png");

  const handleEditOpen = () => {
    setEditPhoto(profile.profileImage || "");
    setEditBio(profile.bio || "");
    setSaveError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: editPhoto || profile.profileImage, bio: editBio }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setProfile((prev) => prev ? { ...prev, profileImage: data.profile.profileImage, bio: data.profile.bio } : prev);
      setEditing(false);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">

        {/* ─── Hero ─────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0d0f1a] p-6 shadow-sm dark:shadow-none">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
                <Image
                  src={profileImageUrl}
                  alt={profile.firstName}
                  width={72}
                  height={72}
                  className="relative h-16 w-16 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shadow-sm dark:shadow-xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
                />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  <FiStar className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
                  GM Profile
                </div>
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 md:text-3xl">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  @{profile.username}
                  {sleeperUsername && (
                    <span className="ml-2 text-zinc-400 dark:text-zinc-600">
                      · Sleeper: <span className="text-zinc-500 dark:text-zinc-400">{sleeperUsername}</span>
                    </span>
                  )}
                </p>
                {!editing && (
                  <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                    {profile.bio || <span className="italic text-zinc-400 dark:text-zinc-600">No bio yet — add one below.</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Win rate + edit button */}
            <div className="shrink-0 flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Career Win Rate</p>
                <p className="text-4xl font-black text-amber-600 dark:text-[#F4D06F]">{winRate}%</p>
                <p className="text-xs text-zinc-500 mt-0.5">{totalWins}W – {totalLosses}L</p>
              </div>
              {!editing && (
                <button
                  onClick={handleEditOpen}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-[#F4D06F] transition-colors"
                >
                  <FiEdit2 className="h-3 w-3" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ─── Inline edit form ─── */}
          {editing && (
            <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800/60 pt-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5">Photo URL</label>
                <input
                  type="url"
                  value={editPhoto}
                  onChange={(e) => setEditPhoto(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition"
                />
                <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">Paste a direct link to an image (JPG, PNG, etc.)</p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell other managers about yourself…"
                  rows={3}
                  maxLength={280}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
                />
                <p className="mt-0.5 text-right text-[10px] text-zinc-400 dark:text-zinc-600">{editBio.length}/280</p>
              </div>
              {saveError && <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 disabled:opacity-60 hover:bg-amber-600 dark:hover:bg-[#f7da8b] transition"
                >
                  <FiCheck className="h-3 w-3" />
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700/60 px-4 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition disabled:opacity-60"
                >
                  <FiX className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Stat Cards ───────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-4 flex flex-col gap-2 shadow-sm dark:shadow-none"
              >
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* ─── Favorite Drafted Players ─────────────────── */}
        <section className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Most Drafted Players</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Players you keep coming back to</p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              Coming Soon
            </span>
          </div>
          <ul className="space-y-2">
            {MOCK_FAVE_PLAYERS.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5"
              >
                <span className={`shrink-0 text-sm font-black w-5 text-center ${i === 0 ? "text-amber-600 dark:text-[#F4D06F]" : "text-zinc-400 dark:text-zinc-600"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
                  <p className="text-[11px] text-zinc-500">{p.position} · {p.team}</p>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Drafted <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{p.drafts}x</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[10px] text-zinc-400 dark:text-zinc-700 italic">
            Will auto-populate once draft history is tracked
          </p>
        </section>

        {/* ─── League History ───────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">League History</h2>

          {sortedSeasons.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No league history found. Link your Sleeper account on the home page.</p>
          ) : (
            <div className="space-y-5">
              {sortedSeasons.map((season) => {
                const leagues = bySeason[season];
                const seasonWins = leagues.reduce((s: number, l) => s + l.record.wins, 0);
                const seasonLosses = leagues.reduce((s: number, l) => s + l.record.losses, 0);
                return (
                  <div key={season}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{season}</span>
                      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-[10px] text-zinc-500">{seasonWins}W – {seasonLosses}L across {leagues.length} league{leagues.length !== 1 ? "s" : ""}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {leagues.map(({ league, record }) => {
                        const gp = record.wins + record.losses;
                        const wr = gp > 0 ? Math.round((record.wins / gp) * 100) : 0;
                        return (
                          <li
                            key={league.league_id}
                            className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{league.name}</p>
                              <p className="text-[11px] text-zinc-500 uppercase">{league.sport}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {record.wins}–{record.losses}{record.ties > 0 ? `–${record.ties}` : ""}
                              </p>
                              <p className={`text-[10px] ${wr >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
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

        {/* ─── ESPN Leagues ─────────────────────────────── */}
        <section className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] p-5 shadow-sm dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ESPN Leagues</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Connect your public ESPN fantasy leagues</p>
            </div>
            <span className="rounded-full border border-red-500/20 bg-red-500/5 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
              ESPN
            </span>
          </div>

          {/* Add league form */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={espnLeagueId}
              onChange={(e) => setEspnLeagueId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEspnLeague()}
              placeholder="ESPN League ID (e.g. 336781)"
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
            />
            <select
              value={espnSeason}
              onChange={(e) => setEspnSeason(e.target.value)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
            >
              {["2025", "2024", "2023", "2022", "2021"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={addEspnLeague}
              disabled={espnAdding || !espnLeagueId.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiPlus className="h-3.5 w-3.5" />
              {espnAdding ? "Adding…" : "Add"}
            </button>
          </div>

          {espnError && (
            <p className="mb-3 text-xs text-red-500 dark:text-red-400">{espnError}</p>
          )}

          {espnLeagues.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              No ESPN leagues added yet. Find your league ID in the ESPN app URL: fantasy.espn.com/football/league?leagueId=<span className="not-italic text-zinc-400">123456</span>
            </p>
          ) : (
            <ul className="space-y-2">
              {espnLeagues.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {l.name ?? `League ${l.leagueId}`}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      ESPN · {l.season}{l.teamCount ? ` · ${l.teamCount} teams` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEspnLeague(l.leagueId, l.season)}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
