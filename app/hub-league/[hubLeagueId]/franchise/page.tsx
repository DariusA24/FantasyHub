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
} from "react-icons/fi";
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
    <div className="min-h-screen bg-gradient-to-br from-[#05060a] via-[#050814] to-[#020308]">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-zinc-200">
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
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-800/40" />)}
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
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400">
          <FiStar className="h-3 w-3 text-[#F4D06F]" />
          Manager · {hubLeague.name}
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">Your League Record</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Awards, rivalries, and season-by-season performance in this hub league.
        </p>
      </div>

      {/* ─── Quick stats ────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Seasons", value: MOCK_SEASONS.length },
          { label: "Total PF", value: totalPF.toFixed(1) },
          { label: "Total PA", value: totalPA.toFixed(1) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-4 text-center"
          >
            <p className="text-xl font-black text-zinc-100">{s.value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Awards ─────────────────────────────────── */}
      <section className="mb-6 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">League Awards</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Your trophy case for this hub league</p>
          </div>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[10px] text-amber-400">
            {MOCK_AWARDS.length} awards
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {MOCK_AWARDS.map((award) => (
            <div
              key={award.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 ${award.style}`}
            >
              <div className="shrink-0 mt-0.5">{award.icon}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold">{award.label}</p>
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-medium">
                    {award.season}
                  </span>
                </div>
                <p className="text-[11px] opacity-70 leading-snug">{award.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-[10px] text-zinc-700 italic">
          Awards will be auto-generated from league history once tracking is active
        </p>
      </section>

      {/* ─── Season-by-season ───────────────────────── */}
      <section className="mb-6 rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">Season-by-Season</h2>
        <div className="space-y-3">
          {MOCK_SEASONS.map((s) => (
            <div
              key={s.season}
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-200">{s.season}</span>
                  <span className={`text-xs font-semibold ${s.finish_color}`}>
                    {s.finish} place
                  </span>
                </div>
                <span className="text-sm font-semibold text-zinc-100">{s.record}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "PF", value: s.pointsFor.toFixed(1) },
                  { label: "PA", value: s.pointsAgainst.toFixed(1) },
                  { label: "High Wk", value: s.highWeek.toFixed(1) },
                  { label: "Low Wk", value: s.lowWeek.toFixed(1) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-zinc-800/40 px-2 py-1.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
                    <p className="text-xs font-semibold text-zinc-200">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Head-to-head rivalries ──────────────────── */}
      <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0a0c14] to-[#050609] p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">Head-to-Head Rivalries</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Your record against other managers in this league</p>
        </div>
        <ul className="space-y-2">
          {MOCK_RIVALRIES.map((r) => (
            <li
              key={r.name}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                {r.name[0]}
              </div>
              <p className="flex-1 text-sm font-medium text-zinc-100">{r.name}</p>
              <span className="text-sm font-semibold text-zinc-200">{r.record}</span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${TREND_STYLE[r.trend]}`}>
                {TREND_ICON[r.trend]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[10px] text-zinc-700 italic">
          Will populate automatically from Sleeper matchup history
        </p>
      </section>
    </>
  );
}
