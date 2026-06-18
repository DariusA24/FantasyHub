"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueNav } from "../LeagueNav";
import {
  FiAward,
  FiTrendingDown,
  FiZap,
  FiShield,
  FiStar,
  FiThumbsDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiRepeat,
  FiUser,
  FiTarget,
} from "react-icons/fi";
import { GiAmericanFootballPlayer } from "react-icons/gi";
import { GiTrophy, GiTie } from "react-icons/gi";

// ─── Types ────────────────────────────────────────────────
type Award = {
  id: string;
  season: string;
  type: AwardType;
  label: string;
  description: string;
  icon: React.ReactNode;
  style: string;
};

type AwardType =
  | "champion"
  | "runner_up"
  | "toilet_bowl"
  | "highest_score"
  | "lowest_score"
  | "most_consistent"
  | "most_transactions"
  | "best_draft";

// ─── Mock manager personality cards ──────────────────────
const MOCK_PERSONALITY = [
  {
    label: "Player Style",
    value: "Veteran",
    sub: "Proven producers over upside",
    icon: <FiShield className="h-4 w-4" />,
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  },
  {
    label: "Favorite Asset",
    value: "Elite WR",
    sub: "Alpha receivers win leagues",
    icon: <FiStar className="h-4 w-4" />,
    accent: "text-[#F4D06F] border-[#F4D06F]/30 bg-[#F4D06F]/5",
  },
  {
    label: "Trade Desire",
    value: "Very Active",
    sub: "Always looking to deal",
    icon: <FiRepeat className="h-4 w-4" />,
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  },
  {
    label: "Favorite Player",
    value: "Justin Jefferson",
    sub: "The GOAT receiver",
    icon: <GiAmericanFootballPlayer className="h-4 w-4" />,
    accent: "text-purple-400 border-purple-500/30 bg-purple-500/5",
  },
  {
    label: "Mode",
    value: "Win Now",
    sub: "No rebuilds, ever",
    icon: <FiTarget className="h-4 w-4" />,
    accent: "text-red-400 border-red-500/30 bg-red-500/5",
  },
  {
    label: "Rival",
    value: "CommishDave",
    sub: "0-5 all time, it haunts me",
    icon: <FiUser className="h-4 w-4" />,
    accent: "text-orange-400 border-orange-500/30 bg-orange-500/5",
  },
];

// ─── Mock manager profile ─────────────────────────────────
const MOCK_PROFILE = {
  name: "Darius Argueta",
  avatarUrl: "", // replace with real URL or Clerk image
  bio: "Fantasy football obsessed since 2015. I live for the waiver wire and I'll trade you into oblivion. Back-to-back champ and proud of it.",
};

// ─── Mock award data ──────────────────────────────────────
const MOCK_AWARDS: Award[] = [
  {
    id: "1",
    season: "2024",
    type: "champion",
    label: "League Champion",
    description: "Won the championship in dominant fashion, going 11-2 in the regular season.",
    icon: <GiTrophy className="h-6 w-6" />,
    style: "border-[#F4D06F]/40 bg-[#F4D06F]/10 text-[#F4D06F]",
  },
  {
    id: "2",
    season: "2023",
    type: "toilet_bowl",
    label: "Toilet Bowl Winner",
    description: "Claimed the coveted last-place consolation prize. Every league needs one.",
    icon: <GiTie className="h-6 w-6" />,
    style: "border-amber-800/40 bg-amber-950/30 text-amber-700",
  },
  {
    id: "3",
    season: "2024",
    type: "highest_score",
    label: "Highest Single Week",
    description: "Put up a record-breaking 198.4 points in Week 9. Nobody was stopping you that week.",
    icon: <FiZap className="h-6 w-6" />,
    style: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "4",
    season: "2023",
    type: "runner_up",
    label: "Runner-Up",
    description: "Made it all the way to the championship but fell just short. So close.",
    icon: <FiAward className="h-6 w-6" />,
    style: "border-zinc-500/40 bg-zinc-700/20 text-zinc-400",
  },
  {
    id: "5",
    season: "2024",
    type: "most_transactions",
    label: "Most Active GM",
    description: "Made 47 waiver/trade moves this season. Never stopped grinding the wire.",
    icon: <FiTrendingDown className="h-6 w-6" />,
    style: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  },
];

// ─── Mock season performance ──────────────────────────────
const MOCK_SEASONS = [
  {
    season: "2024",
    record: "11-2",
    finish: "1st",
    pointsFor: 1842.6,
    pointsAgainst: 1601.3,
    highWeek: 198.4,
    lowWeek: 87.2,
    finish_color: "text-[#F4D06F]",
  },
  {
    season: "2023",
    record: "6-7",
    finish: "8th",
    pointsFor: 1544.2,
    pointsAgainst: 1688.9,
    highWeek: 172.1,
    lowWeek: 64.8,
    finish_color: "text-zinc-400",
  },
];

// ─── Mock head-to-head rivalries ─────────────────────────
const MOCK_RIVALRIES = [
  { name: "CommishDave", record: "4-2", trend: "up" },
  { name: "FantasyGuru", record: "3-3", trend: "flat" },
  { name: "TheRealMVP", record: "1-5", trend: "down" },
];

const TREND_STYLE: Record<string, string> = {
  up: "text-emerald-400",
  flat: "text-zinc-400",
  down: "text-red-400",
};

const TREND_ICON: Record<string, React.ReactNode> = {
  up: <FiCheckCircle className="h-3.5 w-3.5" />,
  flat: <FiShield className="h-3.5 w-3.5" />,
  down: <FiThumbsDown className="h-3.5 w-3.5" />,
};

export default function ManagerPage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const [loading, setLoading] = useState(true);
  const [hubLeague, setHubLeague] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hubLeagueId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/hub-leagues/${hubLeagueId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to load hub league.");
          return;
        }
        const data = await res.json();
        setHubLeague(data.hubLeague ?? null);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hubLeagueId]);

  const pageShell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-gray-800 dark:text-zinc-200">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) {
    return pageShell(
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-zinc-800/60" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />)}
        </div>
        <div className="h-64 rounded-2xl bg-zinc-800/30" />
      </div>
    );
  }

  if (error || !hubLeague) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-red-400 mb-3">{error ?? "Hub league not found."}</p>
        <button className="text-sm text-[#F4D06F] hover:underline" onClick={() => router.back()}>
          ← Go back
        </button>
      </div>
    );
  }

  const totalPF = MOCK_SEASONS.reduce((s, ss) => s + ss.pointsFor, 0);
  const totalPA = MOCK_SEASONS.reduce((s, ss) => s + ss.pointsAgainst, 0);

  return pageShell(
    <>
      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">
          <FiStar className="h-3 w-3 text-[#F4D06F]" />
          Manager · {hubLeague.name}
        </div>
      </div>

      {/* ─── Profile ────────────────────────────────── */}
      <div className="mb-6 flex flex-col items-center hub-card px-5 py-8">
        {MOCK_PROFILE.avatarUrl ? (
          <img
            src={MOCK_PROFILE.avatarUrl}
            alt={MOCK_PROFILE.name}
            className="h-28 w-28 rounded-full object-cover ring-4 ring-zinc-700"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-700 text-4xl font-black text-gray-500 dark:text-zinc-400">
            {MOCK_PROFILE.name[0]}
          </div>
        )}
        <p className="mt-4 text-lg font-bold text-gray-900 dark:text-zinc-100">{MOCK_PROFILE.name}</p>
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-gray-500 dark:text-zinc-400">{MOCK_PROFILE.bio}</p>
      </div>

      {/* ─── Personality cards ───────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOCK_PERSONALITY.map((card) => (
          <div
            key={card.label}
            className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${card.accent}`}
          >
            <div className="flex items-center gap-1.5 opacity-80">
              {card.icon}
              <span className="text-[10px] font-semibold uppercase tracking-widest">{card.label}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{card.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug">{card.sub}</p>
          </div>
        ))}
      </div>
    </>
  );
}
