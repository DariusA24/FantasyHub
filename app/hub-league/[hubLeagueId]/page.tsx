"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LeagueNav } from "./LeagueNav";
import { SeasonAtAGlance } from "./components/SeasonAtAGlance";
import { WeekMatchup } from "./components/WeekMatchup";
import { PowerRankingsCard } from "./components/PowerRankingsCard";
import { LeagueBlog } from "./components/LeagueBlog";
import type { MatchupData, PowerRankingTeam } from "./components/types";
import {
  FiUsers,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiCalendar,
  FiChevronRight,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";


type MemberProfile = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string;
};

type HubLeagueMember = {
  profileId: number;
  role: string;
  createdAt: string;
  profile: MemberProfile;
};

type HubLeagueSeason = {
  id: string;
  sleeperLeagueId: string;
  season: string;
  sleeperName: string | null;
  sleeperSport: string | null;
  createdAt: string;
};

type HubLeague = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  ownerId: number;
  owner: MemberProfile;
  seasons: HubLeagueSeason[];
  members: HubLeagueMember[];
};



const MOCK_RECENT_TRADES = [
  {
    id: 1,
    when: "2h ago",
    teamA: "Darius",
    teamB: "CommishDave",
    gave: ["CeeDee Lamb", "2025 1st"],
    received: ["Justin Jefferson", "2026 2nd"],
  },
  {
    id: 2,
    when: "1d ago",
    teamA: "FantasyGuru",
    teamB: "TheRealMVP",
    gave: ["Ja'Marr Chase"],
    received: ["Tyreek Hill", "2025 2nd", "2026 1st"],
  },
  {
    id: 3,
    when: "3d ago",
    teamA: "GridironKing",
    teamB: "Darius",
    gave: ["Saquon Barkley"],
    received: ["Tony Pollard", "2025 1st"],
  },
];


const ROLE_BADGE: Record<string, string> = {
  owner: "bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30",
  "co-owner": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  member: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600/40",
};

const SPORT_LABEL: Record<string, string> = {
  nfl: "NFL",
  nba: "NBA",
  mlb: "MLB",
  nhl: "NHL",
};

export default function HubLeaguePage() {
  const params = useParams();
  const hubLeagueId = String(params?.hubLeagueId ?? "");
  const router = useRouter();

  type Trade = {
    transaction_id: string;
    when: string;
    teams: { displayName: string; players: { name: string; position: string | null }[]; picks: string[] }[];
  };

  type SleeperUser = { user_id: string; display_name: string; avatar: string | null; is_owner: boolean };

  const [hubLeague, setHubLeague] = useState<HubLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commissionerName, setCommissionerName] = useState<string | null>(null);
  const [commissionerAvatar, setCommissionerAvatar] = useState<string | null>(null);
  const [sleeperUsers, setSleeperUsers] = useState<SleeperUser[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [matchupData, setMatchupData] = useState<MatchupData | null>(null);
  const [matchupLoaded, setMatchupLoaded] = useState(false);
  const [powerRankings, setPowerRankings] = useState<PowerRankingTeam[]>([]);
  const [powerRankingsLoaded, setPowerRankingsLoaded] = useState(false);

  useEffect(() => {
    if (!hubLeagueId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hub-leagues/${hubLeagueId}`);

        if (res.status === 401) {
          setError("You must be signed in to view this hub league.");
          return;
        }
        if (res.status === 403) {
          setError("You are not invited to this hub league.");
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          setError(text || `Failed to load hub league`);
          return;
        }

        const data = await res.json();
        setHubLeague(data.hubLeague ?? null);
        setIsOwner(data.isOwner ?? false);
        if (data.lastSyncedAt) setLastSyncedAt(new Date(data.lastSyncedAt));
        if (data.hubLeague) {
          localStorage.setItem("recentHubLeague", JSON.stringify({ id: hubLeagueId, name: data.hubLeague.name }));

          // Resolve Sleeper commissioner + fetch recent trades + matchup
          const latestSleeperLeagueId = data.hubLeague.seasons?.[0]?.sleeperLeagueId;
          console.log("[matchup] latestSleeperLeagueId:", latestSleeperLeagueId);
          if (latestSleeperLeagueId) {
            const [usersRes, tradesRes, matchupRes, powerRankingsRes] = await Promise.all([
              fetch(`/api/sleeper/league/${latestSleeperLeagueId}/users`),
              fetch(`/api/sleeper/league/${latestSleeperLeagueId}/trades`),
              fetch(`/api/hub-leagues/${hubLeagueId}/matchup`),
              fetch(`/api/hub-leagues/${hubLeagueId}/power-rankings`),
            ]);

            if (usersRes.ok) {
              const users: SleeperUser[] = await usersRes.json();
              setSleeperUsers(users);
              const commUser = users.find((u) => u.is_owner);
              if (commUser) {
                setCommissionerName(commUser.display_name);
                setCommissionerAvatar(
                  commUser.avatar ? `https://sleepercdn.com/avatars/thumbs/${commUser.avatar}` : null
                );
              }
            }

            if (tradesRes.ok) {
              const trades = await tradesRes.json();
              if (Array.isArray(trades)) setRecentTrades(trades);
            }

            const matchupJson = await matchupRes.json().catch(() => null);
            console.log("[matchup] status:", matchupRes.status, "body:", matchupJson);
            if (matchupRes.ok && matchupJson?.matchup !== undefined) {
              setMatchupData(matchupJson);
            }
            setMatchupLoaded(true);

            if (powerRankingsRes.ok) {
              const prJson = await powerRankingsRes.json().catch(() => null);
              if (Array.isArray(prJson?.rankings)) setPowerRankings(prJson.rankings);
            }
            setPowerRankingsLoaded(true);
          } else {
            setMatchupLoaded(true);
            setPowerRankingsLoaded(true);
          }
        }
      } catch (e: any) {
        setError(e?.message ?? "Unknown error loading hub league");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [hubLeagueId]);

  const handleDelete = async () => {
    if (!hubLeagueId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        setError("You must be signed in to delete this hub league.");
        return;
      }
      if (res.status === 403) {
        setError("Only the owner can delete this hub league.");
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to delete hub league.");
        return;
      }

      router.push("/");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error deleting hub league");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/awards/compute-all`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      const results: { season: string; count: number; error?: string }[] = data.results ?? [];
      const failed = results.filter((r) => r.error);
      if (failed.length > 0 && data.totalCount === 0) {
        throw new Error(`All seasons failed. First error: ${failed[0].error}`);
      }
      if (failed.length > 0) {
        setSyncError(`${failed.length} season(s) had errors (${failed.map((r) => r.season).join(", ")})`);
      }

      setLastSyncedAt(new Date());
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (e: any) {
      setSyncError(e?.message ?? "Unknown error");
    } finally {
      setSyncing(false);
    }
  };

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const shell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return shell(
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-gray-200/80 dark:bg-zinc-800/70" />
        <div className="h-4 w-72 rounded-lg bg-gray-200/60 dark:bg-zinc-800/50" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200/50 dark:bg-zinc-800/40" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (error || !hubLeague) {
    return shell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-6">
        <p className="text-red-400 mb-3">{error ?? "Hub league not found."}</p>
        <button className="text-sm text-[#F4D06F] hover:underline" onClick={() => router.back()}>
          ← Go back
        </button>
      </div>
    );
  }

  // ─── Derived data ─────────────────────────────────────────
  const latestSeason = hubLeague.seasons[0];
  const sport = latestSeason?.sleeperSport
    ? SPORT_LABEL[latestSeason.sleeperSport.toLowerCase()] ?? latestSeason.sleeperSport.toUpperCase()
    : null;
  const createdYear = new Date(hubLeague.createdAt).getFullYear();

  const quickLinks = [
    {
      href: `/hub-league/${hubLeagueId}/roster`,
      label: "Roster",
      icon: FiUsers,
      description: "Your active lineup and depth chart",
      gradient: "from-emerald-950/70 to-emerald-900/20",
      border: "border-emerald-800/40 hover:border-emerald-600/60",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      href: `/hub-league/${hubLeagueId}/franchise`,
      label: "Franchise",
      icon: FiShield,
      description: "Settings, awards, and franchise history",
      gradient: "from-blue-950/70 to-blue-900/20",
      border: "border-blue-800/40 hover:border-blue-600/60",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      href: `/hub-league/${hubLeagueId}/bets`,
      label: "Bets",
      icon: FiTrendingUp,
      description: "Side wagers and league bets tracker",
      gradient: "from-purple-950/70 to-purple-900/20",
      border: "border-purple-800/40 hover:border-purple-600/60",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
    {
      href: `/hub-league/${hubLeagueId}/manager`,
      label: "Manager",
      icon: FiUser,
      description: "Your manager profile, grades, and recap",
      gradient: "from-amber-950/70 to-amber-900/20",
      border: "border-amber-800/40 hover:border-amber-600/60",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
  ];

  return shell(
    <>

        {/* ─── Hero Header ──────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/60 dark:border-zinc-800/70 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Hub League Overview
            </div>

            <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
              {hubLeague.name}
            </h1>

            {hubLeague.description && (
              <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-zinc-400">
                {hubLeague.description}
              </p>
            )}

            {/* Meta pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {sport && (
                <span className="rounded-full border border-gray-200 bg-gray-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-zinc-300 uppercase tracking-wide">
                  {sport}
                </span>
              )}
              {latestSeason && (
                <span className="rounded-full border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F4D06F]">
                  {latestSeason.season} Season
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                <FiUsers className="h-3 w-3" />
                {hubLeague.members.length} member{hubLeague.members.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                <FiCalendar className="h-3 w-3" />
                {hubLeague.seasons.length} season{hubLeague.seasons.length !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-gray-400 dark:text-zinc-500">
                Est. {createdYear}
              </span>
            </div>
          </div>

          {/* Commissioner + Hub Owner card */}
          <div className="shrink-0 rounded-xl border border-gray-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/50 px-4 py-3 flex flex-col gap-3 min-w-[200px]">
            {/* Sleeper Commissioner */}
            <div className="flex items-center gap-2.5">
              {commissionerAvatar ? (
                <Image
                  src={commissionerAvatar}
                  alt={commissionerName ?? "Commissioner"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-[#F4D06F]/40 object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4D06F]/15 text-[11px] font-black text-[#F4D06F]">
                  {commissionerName ? commissionerName[0].toUpperCase() : "C"}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F4D06F]/70">Commissioner</p>
                <p className="text-sm font-semibold text-zinc-100">
                  {commissionerName ?? "—"}
                </p>
              </div>
            </div>

            <div className="h-px bg-zinc-800/60" />

            {/* Hub League Owner */}
            <div className="flex items-center gap-2.5">
              <Image
                src={hubLeague.owner.profileImage || "/default-profile.png"}
                alt={hubLeague.owner.username}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-zinc-700 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Hub Owner</p>
                <p className="text-sm font-semibold text-zinc-100 truncate">
                  {hubLeague.owner.firstName} {hubLeague.owner.lastName}
                </p>
                {isOwner && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {syncSuccess ? (
                      <span className="text-emerald-500">Synced just now</span>
                    ) : syncError ? (
                      <span className="text-red-400">{syncError}</span>
                    ) : (
                      <>Synced: {lastSyncedAt ? timeAgo(lastSyncedAt) : "never"}</>
                    )}
                  </p>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  title="Sync Sleeper with Hub"
                  className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800/60 p-1.5 text-zinc-400 transition-all hover:border-[#F4D06F]/40 hover:text-[#F4D06F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiRefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── At-a-glance row ─────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SeasonAtAGlance
            loaded={matchupLoaded}
            seasonGlance={matchupData?.seasonGlance}
            hubLeagueId={hubLeagueId}
          />
          <WeekMatchup
            loaded={matchupLoaded}
            week={matchupData?.week}
            matchup={matchupData?.matchup ?? null}
          />
          <PowerRankingsCard
            loaded={powerRankingsLoaded}
            rankings={powerRankings}
            hubLeagueId={hubLeagueId}
          />
        </div>

        {/* ─── Quick Nav Cards ──────────────────────────────── */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Navigate
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${link.gradient} ${link.border} p-4 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]`}
                >
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${link.iconBg}`}>
                    <Icon className={`h-5 w-5 ${link.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-white">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-zinc-500 leading-tight">
                    {link.description}
                  </p>
                  <FiChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── Members + Blog + Recent Activity ───────────────── */}
        <div className="grid gap-4 grid-cols-6 mb-8 items-start">

          {/* Managers — sourced from Sleeper, all league members regardless of Hub account */}
          <section className="col-span-1 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Managers</h2>
              <span className="rounded-full bg-gray-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
                {sleeperUsers.length || hubLeague.members.length} total
              </span>
            </div>
            {(sleeperUsers.length === 0 ? hubLeague.members : sleeperUsers).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No managers yet.</p>
            ) : sleeperUsers.length > 0 ? (
              <ul className="space-y-2">
                {sleeperUsers.map((u) => (
                  <li key={u.user_id}>
                    <Link
                      href={`/hub-league/${hubLeagueId}/franchise?sleeperUserId=${u.user_id}`}
                      className="hub-inner-card flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-zinc-800/60 transition-colors"
                    >
                      {u.avatar ? (
                        <Image
                          src={`https://sleepercdn.com/avatars/thumbs/${u.avatar}`}
                          alt={u.display_name}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full border border-zinc-700 object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-bold text-zinc-400">
                          {u.display_name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                          {u.display_name}
                        </p>
                        {u.is_owner && (
                          <span className="mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[9px] font-medium capitalize bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30">
                            commissioner
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {hubLeague.members.map((m) => {
                  const roleLower = m.role.toLowerCase();
                  const badgeClass = ROLE_BADGE[roleLower] ?? ROLE_BADGE["member"];
                  return (
                    <li key={m.profileId}>
                      <Link
                        href={`/hub-league/${hubLeagueId}/franchise?profileId=${m.profileId}`}
                        className="hub-inner-card flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-zinc-800/60 transition-colors"
                      >
                        <Image
                          src={m.profile.profileImage || "/default-profile.png"}
                          alt={m.profile.username}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full border border-zinc-700 object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                            {m.profile.firstName} {m.profile.lastName}
                          </p>
                          <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[9px] font-medium capitalize ${badgeClass}`}>
                            {m.role}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <LeagueBlog hubLeagueId={hubLeagueId} />

          {/* Recent Activity */}
          <section className="col-span-2 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Recent Trades</h2>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400">
                Live
              </span>
            </div>

            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-zinc-500">No trades in the last 3 weeks</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentTrades.map((trade) => (
                  <li key={trade.transaction_id} className="hub-inner-card rounded-xl px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {trade.teams.map((t) => t.displayName).join(" ↔ ")}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-300 dark:text-zinc-600">{trade.when}</span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${trade.teams.length}, 1fr)` }}>
                      {trade.teams.map((team) => (
                        <div key={team.displayName}>
                          <p className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-zinc-600 mb-1">
                            {team.displayName} gets
                          </p>
                          <div className="space-y-0.5">
                            {team.players.map((p) => (
                              <p key={p.name} className="text-[11px] font-medium text-emerald-400 truncate">
                                {p.name}
                                {p.position && <span className="ml-1 text-zinc-600">{p.position}</span>}
                              </p>
                            ))}
                            {team.picks.map((pick) => (
                              <p key={pick} className="text-[11px] font-medium text-[#F4D06F]/80 truncate">
                                {pick}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* ─── Danger Zone (owner only) ─────────────────────── */}
        {isOwner && (
          <section className="mb-8 hub-card p-5 border-red-900/30">
            <h2 className="text-sm font-semibold text-zinc-100 mb-1">Danger Zone</h2>
            <p className="text-[11px] text-zinc-500 mb-4">Permanently delete this hub league and all its data.</p>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <p className="text-xs text-red-400 flex-1">This cannot be undone. Are you sure?</p>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:border-red-700/60 transition-colors"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                Delete Hub League
              </button>
            )}
          </section>
        )}

    </>
  );
}