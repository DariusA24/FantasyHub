import { SignInButton, SignUpButton } from "@clerk/nextjs";
import React from "react";
import {
  FiRepeat,
  FiZap,
  FiUsers,
  FiBarChart2,
  FiShield,
  FiTrendingUp,
  FiArrowRight,
  FiCheck,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiShield,
    color: "text-amber-500 dark:text-[#F4D06F]",
    bg: "bg-amber-500/10",
    title: "League Hubs",
    desc: "Private spaces for history, bets, posts, and trophies — tied to your Sleeper season.",
  },
  {
    icon: FiTrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Cross-Season Stats",
    desc: "Win rates and records that follow your league from year to year.",
  },
  {
    icon: FiRepeat,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    title: "Trade Analyzer",
    desc: "FantasyCalc values, bench bonuses, and AI overview — evaluate any deal fast.",
  },
  {
    icon: FiZap,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "Waiver Wire",
    desc: "Best available pickups surfaced week over week without digging through noise.",
  },
  {
    icon: FiUsers,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    title: "Start / Sit",
    desc: "Community votes and projections — always know who deserves to be in your lineup.",
  },
  {
    icon: FiBarChart2,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Power Rankings",
    desc: "Every team's true standing by points and record, updated automatically.",
  },
];

function Guest() {
  return (
    <div className="font-sans min-h-screen bg-zinc-50 dark:bg-[#05060a] text-zinc-800 dark:text-zinc-100">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="mt-[-80px] h-[600px] w-[1000px] rounded-full bg-amber-400/10 dark:bg-[#F4D06F]/8 blur-[140px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-12">

            {/* Left — text + CTAs */}
            <div className="flex-1 max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/60 dark:border-zinc-800/70 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
                Season 2026 · Now Live
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.08] mb-5">
                <span className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-transparent">
                  FantasyHub
                </span>
                <br />
                <span className="text-zinc-900 dark:text-zinc-50">
                  Your league.<br />Your history.
                </span>
              </h1>

              <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
                Connect to your Sleeper leagues and turn them into rich, private hubs — trade tools, power rankings, bets, and a history that never resets.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <SignUpButton>
                  <button className="inline-flex items-center gap-2 rounded-full bg-[#F4D06F] px-6 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(244,208,111,0.35)] transition hover:bg-[#f7e07a] hover:shadow-[0_0_45px_rgba(244,208,111,0.5)]">
                    Get started free
                    <FiArrowRight className="h-4 w-4" />
                  </button>
                </SignUpButton>
                <SignInButton>
                  <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60 px-5 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-300 dark:hover:border-zinc-600">
                    Sign in
                  </button>
                </SignInButton>
              </div>
              <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-600">No credit card required</p>
            </div>

            {/* Right — preview card */}
            <div className="flex-shrink-0 w-full md:w-80">
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl bg-[#F4D06F]/10 blur-2xl" />
                <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md overflow-hidden">
                  {/* card header */}
                  <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Gridiron Greats</p>
                      <p className="text-[10px] text-zinc-500">12-team · Dynasty · 2026</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      Live
                    </span>
                  </div>
                  {/* stats rows */}
                  <div className="px-5 py-4 space-y-3">
                    {[
                      { label: "Season Record", value: "9–4", color: "text-emerald-400" },
                      { label: "Points For", value: "1,842", color: "text-[#F4D06F]" },
                      { label: "Power Rank", value: "#2", color: "text-sky-400" },
                      { label: "Active Bets", value: "3 open", color: "text-purple-400" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">{row.label}</span>
                        <span className={`font-bold ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* mini members row */}
                  <div className="px-5 pb-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {["D","K","M","T","J"].map((l) => (
                        <div key={l} className="h-6 w-6 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500 dark:text-zinc-300">
                          {l}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500">12 managers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
              Tools &amp; features
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Built for serious managers
            </h2>
          </div>
          <SignUpButton>
            <button className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-[#F4D06F] hover:underline underline-offset-2">
              Start for free <FiArrowRight className="h-3.5 w-3.5" />
            </button>
          </SignUpButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 p-5 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${f.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">{f.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works + What you get (side by side) ───────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-4">

          {/* How it works */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
                Simple setup
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Up and running in minutes</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {[
                { n: "01", title: "Connect Sleeper", desc: "Link your Sleeper account in one click. All your leagues import instantly." },
                { n: "02", title: "Create a Hub", desc: "Spin up a private Hub League for any of your Sleeper seasons." },
                { n: "03", title: "Track Everything", desc: "Bets, posts, awards, H2H records — persisted season over season." },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F4D06F]/40 bg-[#F4D06F]/5 text-xs font-extrabold text-[#F4D06F]">
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">{step.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What you get */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#F4D06F] mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
                Hub League
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Private league perks</h2>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                "Private hub for your group",
                "Side bets & wallets",
                "League blog & posts",
                "Trophy room & champions",
                "Head-to-head history",
                "Manager profiles & awards",
                "Unlimited Sleeper leagues",
                "Trade Analyzer",
                "Power Rankings",
                "Start / Sit Optimizer",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <FiCheck className="h-2.5 w-2.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[300px] w-[700px] rounded-full bg-[#F4D06F]/6 blur-[80px]" />
          </div>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
                Ready to level up your league?
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                Connect Sleeper, create a Hub, and get every tool your league has been missing.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SignUpButton>
                <button className="inline-flex items-center gap-2 rounded-full bg-[#F4D06F] px-6 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_25px_rgba(244,208,111,0.3)] transition hover:bg-[#f7e07a] hover:shadow-[0_0_40px_rgba(244,208,111,0.5)]">
                  Create free account
                  <FiArrowRight className="h-4 w-4" />
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60 px-5 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-300 dark:hover:border-zinc-600">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Guest;
