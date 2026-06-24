import { SignUpButton } from "@clerk/nextjs";
import React from "react";

function Guest() {
  return (
    <div className="font-sans flex flex-col items-center justify-start min-h-screen bg-zinc-50 dark:bg-gradient-to-b dark:from-black dark:via-zinc-950 dark:to-black text-zinc-800 dark:text-zinc-100 px-4 md:px-6 pb-28">
      {/* Hero Section */}
      <div className="w-full max-w-6xl pt-16 md:pt-20">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-10">
          <div className="flex-1">
            <p className="text-xs md:text-sm uppercase tracking-[0.25em] text-amber-600 dark:text-amber-300 mb-4">
              FANTASYHUB / NFL
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight text-zinc-900 dark:text-stone-50">
              Your modern
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 dark:from-amber-300 dark:via-orange-300 dark:to-amber-500">
                Fantasy Football Companion
              </span>
            </h1>
            <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mb-6">
              Sync your Sleeper leagues, track bets, and discover powerful tools
              for every matchup—all in one streamlined dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <SignUpButton>
                <button className="inline-flex items-center gap-2 rounded-full bg-amber-400 dark:bg-amber-300 px-6 py-3 text-sm md:text-base font-semibold text-black shadow-[0_0_25px_rgba(250,204,21,0.35)] transition hover:bg-amber-500 dark:hover:bg-amber-400 hover:shadow-[0_0_35px_rgba(250,204,21,0.5)]">
                  JOIN FANTASYHUB
                  <span aria-hidden="true">↗</span>
                </button>
              </SignUpButton>
              <span className="text-xs md:text-sm text-zinc-500">
                No deposit required. Connect Sleeper and start exploring in minutes.
              </span>
            </div>
          </div>

          {/* Right-side visual */}
          <div className="hidden md:flex flex-1 justify-end">
            <div className="relative w-full max-w-xs">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-300/10 to-sky-400/20 blur-2xl opacity-75" />
              <div className="relative rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 px-6 py-5 shadow-lg dark:shadow-xl backdrop-blur">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-300 tracking-[0.2em] mb-2">
                  LIVE SNAPSHOT
                </p>
                <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex justify-between">
                    <span>Active Leagues</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-300">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tracked Bets</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">48</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-300">63%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full max-w-6xl mt-12 mb-8 bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-800 to-transparent" />

      {/* Features Section */}
      <section className="w-full max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs md:text-sm font-semibold text-amber-600 dark:text-amber-300 tracking-[0.25em]">
            FEATURED LEAGUES
          </h2>
          <p className="text-[0.7rem] md:text-xs text-zinc-500">
            Curated from active Sleeper communities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* League Card 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm dark:shadow-md transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_45px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_18px_45px_rgba(15,23,42,0.8)]">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2">
              COMPETITIVE
            </p>
            <p className="text-xl md:text-2xl font-bold mb-1 text-zinc-900 dark:text-zinc-50">
              Gridiron Greats
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              12-team PPR • High stakes • Weekly side pots
            </p>
            <div className="flex items-center gap-3 text-[0.7rem] text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
              <span>Championship history • Deep benches</span>
            </div>
          </div>

          {/* League Card 2 (Trophy) */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm dark:shadow-md transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_45px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_18px_45px_rgba(15,23,42,0.8)] flex items-center gap-4">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-amber-500/15 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <img
              src="/browne-trophey.png"
              alt="Browne Trophy"
              className="h-20 w-auto object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.5)]"
            />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                LEGACY LEAGUE
              </p>
              <p className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Browne Trophy
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dynasty format, multi-year storylines, and a legendary trophy
                that never sleeps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full max-w-6xl mt-12 mb-8 bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-800 to-transparent" />

      {/* How it works */}
      <section className="w-full max-w-6xl">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-xs md:text-sm font-semibold tracking-[0.25em] text-amber-600 dark:text-amber-400 mb-4">
            HOW IT WORKS
          </h2>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400">
            Turn your Sleeper leagues into rich, trackable hubs in three
            streamlined steps—no spreadsheets, no chaos, just clean signal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm">
            <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-sm font-semibold text-amber-600 dark:text-amber-300 border border-zinc-200 dark:border-zinc-700">
              1
            </div>
            <h3 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Create a League Hub
            </h3>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Connect your Sleeper league and instantly spin up a FantasyHub
              "hub" for that season.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm">
            <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-sm font-semibold text-amber-600 dark:text-amber-300 border border-zinc-200 dark:border-zinc-700">
              2
            </div>
            <h3 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Track Bets & Matchups
            </h3>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Log side bets, track outcomes, and keep every matchup's stakes in
              one shared view.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm">
            <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-sm font-semibold text-amber-600 dark:text-amber-300 border border-zinc-200 dark:border-zinc-700">
              3
            </div>
            <h3 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Share the Story
            </h3>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              View win rates, bet history, and league lore that travels with you
              from season to season.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full max-w-6xl mt-12 mb-8 bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-800 to-transparent" />

      {/* Tools Section */}
      <section className="w-full max-w-6xl">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-xs md:text-sm font-semibold tracking-[0.25em] text-amber-600 dark:text-amber-400 mb-4">
            POWER TOOLS
          </h2>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400">
            Deepen your edge with tools built for serious fantasy players, not
            generic projections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-[0_20px_55px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_55px_rgba(15,23,42,0.9)]">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-sky-400/20 via-transparent to-transparent opacity-0 transition hover:opacity-100 pointer-events-none" />
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-2xl">
                🧬
              </span>
              <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Rookie Rankings
              </h3>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Discover the top rookie prospects and compare their fantasy
              outlook before draft day with context-rich tiers.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-[0_20px_55px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_55px_rgba(15,23,42,0.9)]">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-emerald-400/20 via-transparent to-transparent opacity-0 transition hover:opacity-100 pointer-events-none" />
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-2xl">
                ⚖️
              </span>
              <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Trade Calculator
              </h3>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Evaluate trades in seconds with value-based insights and
              position-adjusted context for every player involved.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-[0_20px_55px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_55px_rgba(15,23,42,0.9)]">
            <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-amber-400/25 via-transparent to-transparent opacity-0 transition hover:opacity-100 pointer-events-none" />
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-2xl">
                🔍
              </span>
              <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Sleeper League Finder
              </h3>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Connect with active Sleeper leagues that match your play style,
              buy-in level, and preferred format.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Guest;
