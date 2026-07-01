"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { FiUser, FiArrowLeft, FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { MdOutlineSportsFootball } from "react-icons/md";
import { PlayerDiscussion } from "@/components/player/PlayerDiscussion";

// ─── Types ────────────────────────────────────────────────────────────────────

type SleeperPlayer = {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  rawJson: Record<string, unknown>;
};

type NFLProfile = {
  classYear: number | null;
  yearsExp: number | null;
  value: number | null;
  trend30Day: number | null;
  redraftValue: number | null;
  tier: number | null;
  draftPick: {
    round: number; pick: number; overall: number;
    nflTeam: string; collegeTeam: string | null;
    preDraftRanking: number | null; preDraftGrade: number | null;
  } | null;
  bio: {
    height: string | null;
    weight: number | null;
    college: string | null;
    birthDate: string | null;
    jerseyNum: number | string | null;
    status: string | null;
    injStatus: string | null;
    depthOrder: number | null;
  };
};

type SeasonStats = Record<string, number>;

// ─── Constants ────────────────────────────────────────────────────────────────

const POS_COLOR: Record<string, string> = {
  QB:  "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  RB:  "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  WR:  "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  TE:  "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

type StatDef = { key: string; label: string; fmt?: (v: number, s: SeasonStats) => string };

function pct(num: string, den: string) {
  return (_v: number, s: SeasonStats) => {
    const d = s[den];
    return d ? `${((s[num] / d) * 100).toFixed(1)}%` : "—";
  };
}

const POS_STATS: Record<string, StatDef[]> = {
  QB: [
    { key: "pass_yd",  label: "Pass Yds",  fmt: (v) => v.toLocaleString() },
    { key: "pass_td",  label: "Pass TDs" },
    { key: "pass_int", label: "INTs" },
    { key: "pass_cmp", label: "Comp %",    fmt: pct("pass_cmp", "pass_att") },
    { key: "pass_att", label: "Attempts" },
    { key: "rush_yd",  label: "Rush Yds",  fmt: (v) => v.toLocaleString() },
    { key: "rush_td",  label: "Rush TDs" },
  ],
  RB: [
    { key: "rush_yd",  label: "Rush Yds",  fmt: (v) => v.toLocaleString() },
    { key: "rush_att", label: "Carries" },
    { key: "rush_td",  label: "Rush TDs" },
    { key: "rec",      label: "Rec" },
    { key: "rec_yd",   label: "Rec Yds",   fmt: (v) => v.toLocaleString() },
    { key: "rec_td",   label: "Rec TDs" },
  ],
  WR: [
    { key: "rec",      label: "Rec" },
    { key: "rec_tgt",  label: "Targets" },
    { key: "rec_yd",   label: "Rec Yds",   fmt: (v) => v.toLocaleString() },
    { key: "rec_td",   label: "Rec TDs" },
    { key: "rec_yd",   label: "Yds/Rec",   fmt: (_v, s) => s.rec ? (s.rec_yd / s.rec).toFixed(1) : "—" },
    { key: "rush_yd",  label: "Rush Yds",  fmt: (v) => v.toLocaleString() },
  ],
  TE: [
    { key: "rec",      label: "Rec" },
    { key: "rec_tgt",  label: "Targets" },
    { key: "rec_yd",   label: "Rec Yds",   fmt: (v) => v.toLocaleString() },
    { key: "rec_td",   label: "Rec TDs" },
    { key: "rec_yd",   label: "Yds/Rec",   fmt: (_v, s) => s.rec ? (s.rec_yd / s.rec).toFixed(1) : "—" },
  ],
};

// ─── Grade ────────────────────────────────────────────────────────────────────

function dynastyGrade(value: number | null): { label: string; color: string; glow: string } {
  if (!value) return { label: "—", color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10", glow: "" };
  if (value >= 8500) return { label: "ELITE", color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10", glow: "shadow-[0_0_20px_rgba(244,208,111,0.25)]" };
  if (value >= 6500) return { label: "A+",    color: "text-amber-400 border-amber-400/50 bg-amber-400/10",  glow: "shadow-[0_0_16px_rgba(251,191,36,0.2)]" };
  if (value >= 5000) return { label: "A",     color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10", glow: "" };
  if (value >= 3500) return { label: "A−",    color: "text-sky-400 border-sky-400/50 bg-sky-400/10", glow: "" };
  if (value >= 2200) return { label: "B+",    color: "text-violet-400 border-violet-400/50 bg-violet-400/10", glow: "" };
  if (value >= 1200) return { label: "B",     color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10", glow: "" };
  return                     { label: "C",    color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10", glow: "" };
}

function draftRoundColor(round: number): string {
  if (round === 1) return "text-[#F4D06F] border-[#F4D06F]/40 bg-[#F4D06F]/10";
  if (round === 2) return "text-emerald-400 border-emerald-400/40 bg-emerald-400/10";
  if (round === 3) return "text-sky-400 border-sky-400/40 bg-sky-400/10";
  if (round <= 5)  return "text-violet-400 border-violet-400/40 bg-violet-400/10";
  return "text-zinc-400 border-zinc-600/30 bg-zinc-700/10";
}

// ─── Small shared UI ──────────────────────────────────────────────────────────

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}

function StatCell({ def, stats, loading }: { def: StatDef; stats: SeasonStats; loading: boolean }) {
  const raw = stats[def.key];
  const display = loading
    ? null
    : def.fmt
    ? def.fmt(raw ?? 0, stats)
    : raw != null
    ? Number.isInteger(raw)
      ? raw.toLocaleString()
      : raw.toFixed(1)
    : "—";

  return (
    <div className="bg-white dark:bg-zinc-900/80 px-3 py-2.5">
      {loading ? (
        <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1" />
      ) : (
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{display}</p>
      )}
      <p className="text-[10px] text-zinc-500 mt-0.5">{def.label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const router = useRouter();

  const [player, setPlayer] = useState<SleeperPlayer | null>(null);
  const [profile, setProfile] = useState<NFLProfile | null>(null);
  const [allStats, setAllStats] = useState<Record<number, SeasonStats>>({});
  const [allStatsLoading, setAllStatsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  // Load player + profile in parallel
  useEffect(() => {
    if (!playerId) return;
    Promise.all([
      fetch(`/api/sleeper/players/${playerId}`).then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      }),
      fetch(`/api/scouting/nfl-profile?sleeperId=${playerId}`).then((r) => r.json()).catch(() => null),
    ]).then(([playerData, profileData]) => {
      if (playerData) setPlayer(playerData);
      if (profileData && !profileData.error) setProfile(profileData);
    });
  }, [playerId]);

  // Fetch all available seasons in parallel once we know classYear
  const classYear = profile?.classYear ?? null;
  useEffect(() => {
    if (!playerId) return;
    const earliest = Math.max(classYear ?? 2022, 2015);
    const years: number[] = [];
    for (let y = earliest; y <= 2025; y++) years.push(y);
    const yearsToFetch = [...years].reverse(); // most recent first

    setAllStatsLoading(true);
    Promise.all(
      yearsToFetch.map((year) =>
        fetch(`/api/players/${playerId}/season-stats?season=${year}`)
          .then((r) => r.json())
          .then((d) => ({ year, stats: (d ?? {}) as SeasonStats }))
          .catch(() => ({ year, stats: {} as SeasonStats }))
      )
    )
      .then((results) => {
        const map: Record<number, SeasonStats> = {};
        for (const { year, stats } of results) map[year] = stats;
        setAllStats(map);
      })
      .finally(() => setAllStatsLoading(false));
  }, [playerId, classYear]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Player not found.</p>
      </div>
    );
  }

  const pos = player?.position ?? "";
  const posColor = POS_COLOR[pos] ?? "border-zinc-300 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400";
  const grade = dynastyGrade(profile?.value ?? null);
  const statDefs = POS_STATS[pos] ?? [];

  // Years with any stats data (most recent first)
  const statYears = Object.keys(allStats)
    .map(Number)
    .sort((a, b) => b - a);

  const trend = profile?.trend30Day ?? null;
  const dp = profile?.draftPick;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-10">

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <MdOutlineSportsFootball className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
            Player Profile
          </div>
        </div>

        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-6 mb-4 overflow-hidden ${grade.glow}`}>
          <div className="flex items-start gap-5">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center overflow-hidden shadow-md">
                {!imgErr && player ? (
                  <Image
                    src={`https://sleepercdn.com/content/nfl/players/${playerId}.jpg`}
                    alt={player.full_name ?? "Player"}
                    width={80}
                    height={80}
                    className="object-cover object-top w-full h-full"
                    onError={() => setImgErr(true)}
                  />
                ) : (
                  <FiUser className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
                )}
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {player ? (
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                      {player.full_name}
                    </h1>
                  ) : (
                    <div className="h-7 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800/60 animate-pulse" />
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {pos && (
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${posColor}`}>{pos}</span>
                    )}
                    {player?.team && (
                      <span className="rounded-full border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                        {player.team}
                      </span>
                    )}
                    {profile?.bio.jerseyNum != null && (
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500">#{profile.bio.jerseyNum}</span>
                    )}
                    {profile?.bio.injStatus && (
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400">
                        {profile.bio.injStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grade badge */}
                {profile && (
                  <div className={`rounded-2xl border px-3 py-2 text-center shrink-0 ${grade.color}`}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-70 mb-0.5">Grade</p>
                    <p className="text-xl font-extrabold">{grade.label}</p>
                  </div>
                )}
              </div>

              {/* Dynasty value + trend */}
              {profile && (
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Dynasty Value</p>
                    <p className="text-[20px] font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums leading-tight">
                      {profile.value?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  {trend !== null && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">30d Trend</p>
                      <div className={`flex items-center gap-1 text-[15px] font-bold tabular-nums ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-zinc-400"}`}>
                        {trend > 0 ? <FiTrendingUp className="h-4 w-4" /> : trend < 0 ? <FiTrendingDown className="h-4 w-4" /> : null}
                        {trend > 0 ? "+" : ""}{trend}
                      </div>
                    </div>
                  )}
                  {profile.redraftValue && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Redraft</p>
                      <p className="text-[15px] font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{profile.redraftValue.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Draft strip */}
          {dp && (
            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/40 flex items-center gap-3 flex-wrap">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wide ${draftRoundColor(dp.round)}`}>
                Rd {dp.round} · #{dp.overall} OVR
              </span>
              <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">{dp.nflTeam}</span>
              {dp.collegeTeam && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600">· {dp.collegeTeam}</span>
              )}
              {classYear && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600 ml-auto">{classYear} NFL Draft</span>
              )}
            </div>
          )}
        </div>

        {/* ── Pre-draft Scouting (if available) ──────────────────────────── */}
        {dp && (dp.preDraftGrade || dp.preDraftRanking) && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-3">Pre-Draft Scouting</p>
            <div className="flex gap-6 flex-wrap">
              {dp.preDraftGrade && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">Scout Grade</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#F4D06F]"
                        style={{ width: `${(dp.preDraftGrade / 100) * 100}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-extrabold text-zinc-900 dark:text-zinc-100">{dp.preDraftGrade}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600">/ 100</span>
                  </div>
                </div>
              )}
              {dp.preDraftRanking && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">Pre-Draft Rank</p>
                  <p className="text-[13px] font-extrabold text-zinc-900 dark:text-zinc-100">#{dp.preDraftRanking}</p>
                </div>
              )}
              {profile?.yearsExp !== null && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">Experience</p>
                  <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
                    {profile?.yearsExp === 0 ? "Rookie" : `${profile?.yearsExp} yr${(profile?.yearsExp ?? 0) > 1 ? "s" : ""}`}
                  </p>
                </div>
              )}
              {profile?.bio.depthOrder === 1 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">Depth Chart</p>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-px text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Starter</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Season Stats (multi-year table) ─────────────────────────────── */}
        {statDefs.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Career Stats</p>
            </div>

            {allStatsLoading ? (
              <div className="flex flex-col">
                {[2025, 2024, 2023].map((y) => (
                  <div key={y} className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/30 animate-pulse">
                    <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-800" />
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-max">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/80 dark:bg-zinc-900/40">
                      <th className="px-5 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 sticky left-0 bg-zinc-50/80 dark:bg-zinc-900/40">
                        Season
                      </th>
                      <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right whitespace-nowrap">
                        G
                      </th>
                      <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right whitespace-nowrap">
                        PPR/G
                      </th>
                      {statDefs.map((def, i) => (
                        <th key={`${def.key}-${i}`} className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right whitespace-nowrap">
                          {def.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statYears.map((year) => {
                      const s = allStats[year] ?? {};
                      const gp = s.gp ?? 0;
                      const totalPts = s.pts_ppr ?? 0;
                      const avgPts = gp > 0 ? totalPts / gp : null;
                      const hasData = gp > 0 || Object.values(s).some((v) => v > 0);
                      const isMostRecent = year === statYears[0];

                      return (
                        <tr
                          key={year}
                          className={`border-b border-zinc-100 dark:border-zinc-800/30 last:border-0 transition-colors ${
                            isMostRecent
                              ? "bg-amber-50/40 dark:bg-amber-500/[0.03]"
                              : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/10"
                          }`}
                        >
                          <td className={`px-5 py-3 sticky left-0 ${isMostRecent ? "bg-amber-50/40 dark:bg-amber-500/[0.03]" : "bg-white dark:bg-zinc-900/30"}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-extrabold text-zinc-900 dark:text-zinc-100">{year}</span>
                              {isMostRecent && (
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  Latest
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                              {hasData ? gp : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={`text-[12px] font-semibold tabular-nums ${avgPts !== null ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-300 dark:text-zinc-700"}`}>
                              {avgPts !== null ? avgPts.toFixed(1) : "—"}
                            </span>
                          </td>
                          {statDefs.map((def, i) => {
                            const raw = s[def.key];
                            const display = def.fmt
                              ? def.fmt(raw ?? 0, s)
                              : raw != null && raw !== 0
                              ? Number.isInteger(raw)
                                ? raw.toLocaleString()
                                : raw.toFixed(1)
                              : "—";
                            return (
                              <td key={`${def.key}-${i}`} className="px-3 py-3 text-right">
                                <span className={`text-[12px] font-semibold tabular-nums ${display === "—" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-800 dark:text-zinc-200"}`}>
                                  {display}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {statYears.length === 0 && (
                      <tr>
                        <td colSpan={statDefs.length + 3} className="py-8 text-center">
                          <MdOutlineSportsFootball className="h-7 w-7 text-zinc-300 dark:text-zinc-700 mx-auto mb-1" />
                          <p className="text-[12px] text-zinc-400 dark:text-zinc-600">No stats available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Bio ──────────────────────────────────────────────────────────── */}
        {profile?.bio && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <InfoTile label="Height" value={profile.bio.height} />
            <InfoTile label="Weight" value={profile.bio.weight ? `${profile.bio.weight} lbs` : null} />
            <InfoTile label="College" value={profile.bio.college} />
            <InfoTile
              label="Born"
              value={
                profile.bio.birthDate
                  ? new Date(profile.bio.birthDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : null
              }
            />
          </div>
        )}

        {/* ── Live Discussion (collapsible) ────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 overflow-hidden">
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Live Discussion</span>
            </div>
            {chatOpen ? (
              <FiChevronUp className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
            ) : (
              <FiChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
            )}
          </button>

          {chatOpen && playerId && (
            <div className="border-t border-zinc-200 dark:border-zinc-800/60">
              <PlayerDiscussion playerId={playerId} height={420} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
