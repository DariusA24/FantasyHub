"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LeagueNav } from "./LeagueNav";
import {
  FiUsers,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiCalendar,
  FiTrash2,
  FiChevronRight,
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

const MOCK_POSTS = [
  {
    id: 1,
    tag: "Recap",
    date: "Week 14",
    title: "The Miracle on Turf: How I Survived Without My RB1",
    excerpt:
      "After losing my starting running back to injury in the first quarter, I was dead in the water. Then Justin Jefferson went absolutely nuclear for 214 yards and 3 TDs.",
    author: "CommishDave",
    readTime: "3 min read",
  },
  {
    id: 2,
    tag: "Trade",
    date: "Week 12",
    title: "Robbery of the Year? Breaking Down the CeeDee Lamb Blockbuster",
    excerpt:
      "Multiple first-round picks for a single receiver. The league is still arguing whether this trade broke the competitive balance or was simply genius.",
    author: "FantasyGuru",
    readTime: "5 min read",
  },
  {
    id: 3,
    tag: "Power Rankings",
    date: "Week 13",
    title: "Week 13 Power Rankings: The Throne Is Up for Grabs",
    excerpt:
      "Three teams tied atop the standings with two weeks to go. Here's our updated power rankings and playoff picture heading into the final stretch.",
    author: "CommishDave",
    readTime: "4 min read",
  },
  {
    id: 4,
    tag: "Trash Talk",
    date: "Week 11",
    title: "An Open Letter to the Team That Benched Tyreek Hill",
    excerpt:
      "We get it, he had a bad couple weeks. But you benched him against the worst secondary in the league. You only have yourself to blame.",
    author: "TheRealMVP",
    readTime: "2 min read",
  },
];

const POST_TAG_STYLE: Record<string, string> = {
  Recap: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  Trade: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "Power Rankings": "border-[#F4D06F]/30 bg-[#F4D06F]/10 text-[#F4D06F]",
  "Trash Talk": "border-red-500/30 bg-red-500/10 text-red-400",
};

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30",
  "co-owner": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  member: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
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

  const [hubLeague, setHubLeague] = useState<HubLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308] p-6 text-zinc-200">
        <LeagueNav />
        <div className="mx-auto max-w-4xl mt-6 space-y-4">
          <div className="h-8 w-48 rounded-xl bg-zinc-800/70 animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-zinc-800/50 animate-pulse" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (error || !hubLeague) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308] p-6 text-zinc-200">
        <LeagueNav />
        <div className="mx-auto max-w-4xl mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-6">
          <p className="text-red-400 mb-3">{error ?? "Hub league not found."}</p>
          <button
            className="text-sm text-[#F4D06F] hover:underline"
            onClick={() => router.back()}
          >
            ← Go back
          </button>
        </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
        <LeagueNav />

        {/* ─── Hero Header ──────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Hub League Overview
            </div>

            <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
              {hubLeague.name}
            </h1>

            {hubLeague.description && (
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                {hubLeague.description}
              </p>
            )}

            {/* Meta pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {sport && (
                <span className="rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 uppercase tracking-wide">
                  {sport}
                </span>
              )}
              {latestSeason && (
                <span className="rounded-full border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F4D06F]">
                  {latestSeason.season} Season
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-400">
                <FiUsers className="h-3 w-3" />
                {hubLeague.members.length} member{hubLeague.members.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-400">
                <FiCalendar className="h-3 w-3" />
                {hubLeague.seasons.length} season{hubLeague.seasons.length !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500">
                Est. {createdYear}
              </span>
            </div>
          </div>

          {/* Owner card */}
          <div className="shrink-0 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 flex items-center gap-3">
            <div className="relative">
              <Image
                src={hubLeague.owner.profileImage || "/default-profile.png"}
                alt={hubLeague.owner.username}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#F4D06F] border-2 border-zinc-900" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Commissioner</p>
              <p className="text-sm font-semibold text-zinc-100">
                {hubLeague.owner.firstName} {hubLeague.owner.lastName}
              </p>
              <p className="text-[11px] text-zinc-400">@{hubLeague.owner.username}</p>
            </div>
          </div>
        </div>

        {/* ─── Quick Nav Cards ──────────────────────────────── */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
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
                  <p className="text-sm font-semibold text-zinc-100 group-hover:text-white">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 leading-tight">
                    {link.description}
                  </p>
                  <FiChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── Members + Season History grid ───────────────── */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Members */}
          <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Members</h2>
              <span className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400">
                {hubLeague.members.length} total
              </span>
            </div>

            {hubLeague.members.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No members yet.</p>
            ) : (
              <ul className="space-y-2">
                {hubLeague.members.map((m) => {
                  const roleLower = m.role.toLowerCase();
                  const badgeClass = ROLE_BADGE[roleLower] ?? ROLE_BADGE["member"];
                  return (
                    <li
                      key={m.profileId}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-3 py-2"
                    >
                      <Image
                        src={m.profile.profileImage || "/default-profile.png"}
                        alt={m.profile.username}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full border border-zinc-700 object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {m.profile.firstName} {m.profile.lastName}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          @{m.profile.username}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${badgeClass}`}
                      >
                        {m.role}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Season History */}
          <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Season History</h2>
              <span className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400">
                {hubLeague.seasons.length} season{hubLeague.seasons.length !== 1 ? "s" : ""}
              </span>
            </div>

            {hubLeague.seasons.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No seasons linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {hubLeague.seasons.map((s, idx) => {
                  const isLatest = idx === 0;
                  const sportLabel = s.sleeperSport
                    ? SPORT_LABEL[s.sleeperSport.toLowerCase()] ?? s.sleeperSport.toUpperCase()
                    : null;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-3 py-3"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          isLatest
                            ? "bg-[#F4D06F]/15 text-[#F4D06F]"
                            : "bg-zinc-800/60 text-zinc-400"
                        }`}
                      >
                        {s.season.slice(-2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {s.sleeperName ?? "Unnamed League"}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {s.season}
                          {sportLabel ? ` · ${sportLabel}` : ""}
                        </p>
                      </div>
                      {isLatest && (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          Current
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ─── League Blog ─────────────────────────────────── */}
        <section className="mb-8 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">League Blog</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                News, recaps, and trash talk from your league
              </p>
            </div>
            <button className="rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition">
              + New Post
            </button>
          </div>

          <ul className="space-y-3">
            {MOCK_POSTS.map((post) => (
              <li
                key={post.id}
                className="group rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3 hover:border-zinc-700/60 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${POST_TAG_STYLE[post.tag]}`}
                      >
                        {post.tag}
                      </span>
                      <span className="text-[10px] text-zinc-600">{post.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                      {post.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                  <FiChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                    <div className="h-full w-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
                  </div>
                  <span className="text-[10px] text-zinc-500">{post.author}</span>
                  <span className="text-[10px] text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-600">{post.readTime}</span>
                </div>
              </li>
            ))}
          </ul>

          <button className="mt-3 w-full rounded-xl border border-dashed border-zinc-800/60 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-700/60 transition">
            View all posts
          </button>
        </section>

        {/* ─── Danger Zone ─────────────────────────────────── */}
        <section className="rounded-2xl border border-red-900/30 bg-red-950/10 p-5">
          <h2 className="mb-1 text-sm font-semibold text-red-400">Danger Zone</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Permanently delete this hub league and all linked data. This action cannot be undone.
          </p>

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-300">Are you sure?</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 transition"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              Delete Hub League
            </button>
          )}
        </section>
      </div>
    </div>
  );
}