"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueNav } from "../LeagueNav";
import { FiTrendingUp, FiPlus, FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import { GiTwoCoins } from "react-icons/gi";

// ─── Mock data ────────────────────────────────────────────
const MOCK_BETS = [
  {
    id: "1",
    description: "Darius finishes top 3 this season",
    bettor: "CommishDave",
    opponent: "Darius",
    amount: "$20",
    status: "active",
    createdAt: "Week 1",
  },
  {
    id: "2",
    description: "FantasyGuru makes the playoffs",
    bettor: "TheRealMVP",
    opponent: "FantasyGuru",
    amount: "$10",
    status: "won",
    createdAt: "Week 3",
  },
  {
    id: "3",
    description: "GridironKing scores 200+ in a single week",
    bettor: "Darius",
    opponent: "GridironKing",
    amount: "$15",
    status: "lost",
    createdAt: "Week 5",
  },
  {
    id: "4",
    description: "Last place finisher buys pizza for the league",
    bettor: "CommishDave",
    opponent: "Entire League",
    amount: "Pizza",
    status: "active",
    createdAt: "Week 1",
  },
];

const STATUS_STYLE: Record<string, string> = {
  active: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  lost: "border-red-500/30 bg-red-500/10 text-red-400",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <FiClock className="h-3 w-3" />,
  won: <FiCheckCircle className="h-3 w-3" />,
  lost: <FiXCircle className="h-3 w-3" />,
};

export default function BetsPage() {
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

  const active = MOCK_BETS.filter((b) => b.status === "active");
  const settled = MOCK_BETS.filter((b) => b.status !== "active");

  return pageShell(
    <>
      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">
          <FiTrendingUp className="h-3 w-3 text-[#F4D06F]" />
          Bets · {hubLeague.name}
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">Side Bets</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-500">
          Track wagers and side bets between managers in this league.
        </p>
      </div>

      {/* ─── Quick stats ────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Active Bets", value: active.length },
          { label: "Won", value: MOCK_BETS.filter((b) => b.status === "won").length },
          { label: "Lost", value: MOCK_BETS.filter((b) => b.status === "lost").length },
        ].map((s) => (
          <div
            key={s.label}
            className="hub-card p-4 text-center"
          >
            <p className="text-xl font-black text-gray-900 dark:text-zinc-100">{s.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Active Bets ────────────────────────────── */}
      <section className="mb-6 hub-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Active Bets</h2>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Open wagers still in play</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition">
            <FiPlus className="h-3 w-3" />
            New Bet
          </button>
        </div>

        {active.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No active bets yet.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((bet) => (
              <li
                key={bet.id}
                className="hub-inner-card flex items-start gap-3 rounded-xl px-4 py-3"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4D06F]/10">
                  <GiTwoCoins className="h-4 w-4 text-[#F4D06F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{bet.description}</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    {bet.bettor} <span className="text-gray-200 dark:text-zinc-700">vs</span> {bet.opponent} · {bet.createdAt}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-gray-800 dark:text-zinc-200">{bet.amount}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[bet.status]}`}>
                    {STATUS_ICON[bet.status]} Active
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Settled Bets ───────────────────────────── */}
      <section className="hub-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Settled Bets</h2>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Closed wagers with a result</p>
        </div>

        {settled.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No settled bets yet.</p>
        ) : (
          <ul className="space-y-2">
            {settled.map((bet) => (
              <li
                key={bet.id}
                className="hub-inner-card flex items-start gap-3 rounded-xl px-4 py-3"
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bet.status === "won" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <GiTwoCoins className={`h-4 w-4 ${bet.status === "won" ? "text-emerald-400" : "text-red-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{bet.description}</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    {bet.bettor} <span className="text-gray-200 dark:text-zinc-700">vs</span> {bet.opponent} · {bet.createdAt}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-gray-800 dark:text-zinc-200">{bet.amount}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLE[bet.status]}`}>
                    {STATUS_ICON[bet.status]} {bet.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-center text-[10px] text-gray-200 dark:text-zinc-700 italic">
          Bets will sync automatically once tracking is active
        </p>
      </section>
    </>
  );
}