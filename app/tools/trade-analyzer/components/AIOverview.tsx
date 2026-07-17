"use client";

import { useState } from "react";
import type { SelectedPlayer } from "../types";

type Props = {
  sideA: SelectedPlayer[];
  sideB: SelectedPlayer[];
  isDynasty: boolean;
  numQbs: 1 | 2;
  ppr: 0 | 0.5 | 1;
  waiverA: number;
  waiverB: number;
};

export function AIOverview({ sideA, sideB, isDynasty, numQbs, ppr, waiverA, waiverB }: Props) {
  const [overview, setOverview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = sideA.length > 0 && sideB.length > 0;

  async function generate() {
    setLoading(true);
    setOverview(null);
    setError(null);
    try {
      const res = await fetch("/api/trade-analyzer/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sideA: sideA.map((p) => ({ name: p.name, position: p.position, value: p.value, age: p.age, tier: p.tier, trend: p.trend, redraftValue: p.redraftValue })),
          sideB: sideB.map((p) => ({ name: p.name, position: p.position, value: p.value, age: p.age, tier: p.tier, trend: p.trend, redraftValue: p.redraftValue })),
          isDynasty,
          numQbs,
          ppr,
          waiverA,
          waiverB,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Unknown error");
      setOverview(data.overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate overview");
    } finally {
      setLoading(false);
    }
  }

  if (!canGenerate) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">AI Overview</span>
          <span className="hidden sm:inline text-[10px] text-zinc-500 dark:text-zinc-600">powered by Claude</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-violet-300/40 border-t-violet-500 dark:border-violet-700 dark:border-t-violet-300 animate-spin inline-block" />
              Analyzing…
            </>
          ) : (
            <>
              <span className="text-base leading-none">✦</span>
              {overview ? "Re-analyze" : "Analyze Trade"}
            </>
          )}
        </button>
      </div>

      {overview && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{overview}</p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
