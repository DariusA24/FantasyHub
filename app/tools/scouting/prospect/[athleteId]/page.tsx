"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiUser, FiLock } from "react-icons/fi";
import { HiStar, HiSparkles } from "react-icons/hi2";
import { FiStar } from "react-icons/fi";
import { MdOutlineSportsFootball } from "react-icons/md";
import { ScoutingBoard } from "@/components/scouting/ScoutingBoard";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatsByCategory = Record<string, Record<string, number>>;
type StatsByYear = Record<number, StatsByCategory>;

type ProfileData = {
  playerInfo: {
    team: string;
    teamColor: string | null;
    teamColorSecondary: string | null;
    jersey: string | null;
  } | null;
  roster: {
    year: number | null;
    jersey: string | null;
    homeCity: string | null;
    homeState: string | null;
  } | null;
  statsByYear: StatsByYear;
  currentTeam: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POS_COLOR: Record<string, string> = {
  QB:  "text-red-400 border-red-500/30 bg-red-500/10",
  RB:  "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  WR:  "text-blue-400 border-blue-500/30 bg-blue-500/10",
  TE:  "text-orange-400 border-orange-500/30 bg-orange-500/10",
  ATH: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

// Ordered stat rows per position (category → statType label, format)
type StatRow = { cat: string; key: string; label: string; fmt?: (v: number) => string };

// CFBD stat key notes:
//  passing.pct       = decimal (0.614) → multiply × 100 for display
//  passing.completions = completions count (not "cmp")
//  receiving.ypr     = yards per reception (not "ypc")
//  rushing.ypc       = yards per carry

const STAT_CONFIG: Record<string, StatRow[]> = {
  QB: [
    { cat: "passing",  key: "yds",         label: "Pass Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "passing",  key: "td",          label: "Pass TD" },
    { cat: "passing",  key: "int",         label: "INT" },
    { cat: "passing",  key: "completions", label: "Completions" },
    { cat: "passing",  key: "att",         label: "Attempts" },
    { cat: "passing",  key: "pct",         label: "Comp %",     fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { cat: "passing",  key: "ypa",         label: "YPA",        fmt: (v) => v.toFixed(1) },
    { cat: "rushing",  key: "yds",         label: "Rush Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "rushing",  key: "td",          label: "Rush TD" },
    { cat: "rushing",  key: "car",         label: "Carries" },
    { cat: "rushing",  key: "ypc",         label: "YPC",        fmt: (v) => v.toFixed(1) },
  ],
  RB: [
    { cat: "rushing",  key: "yds",  label: "Rush Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "rushing",  key: "td",   label: "Rush TD" },
    { cat: "rushing",  key: "car",  label: "Carries" },
    { cat: "rushing",  key: "ypc",  label: "YPC",        fmt: (v) => v.toFixed(1) },
    { cat: "receiving",key: "rec",  label: "Receptions" },
    { cat: "receiving",key: "yds",  label: "Rec Yds",    fmt: (v) => v.toLocaleString() },
    { cat: "receiving",key: "td",   label: "Rec TD" },
    { cat: "receiving",key: "ypr",  label: "YPR",        fmt: (v) => v.toFixed(1) },
  ],
  WR: [
    { cat: "receiving",key: "rec",  label: "Receptions" },
    { cat: "receiving",key: "yds",  label: "Rec Yds",    fmt: (v) => v.toLocaleString() },
    { cat: "receiving",key: "td",   label: "Rec TD" },
    { cat: "receiving",key: "ypr",  label: "YPR",        fmt: (v) => v.toFixed(1) },
    { cat: "rushing",  key: "yds",  label: "Rush Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "rushing",  key: "td",   label: "Rush TD" },
  ],
  TE: [
    { cat: "receiving",key: "rec",  label: "Receptions" },
    { cat: "receiving",key: "yds",  label: "Rec Yds",    fmt: (v) => v.toLocaleString() },
    { cat: "receiving",key: "td",   label: "Rec TD" },
    { cat: "receiving",key: "ypr",  label: "YPR",        fmt: (v) => v.toFixed(1) },
  ],
  ATH: [
    { cat: "rushing",  key: "yds",  label: "Rush Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "rushing",  key: "td",   label: "Rush TD" },
    { cat: "rushing",  key: "car",  label: "Carries" },
    { cat: "receiving",key: "rec",  label: "Receptions" },
    { cat: "receiving",key: "yds",  label: "Rec Yds",    fmt: (v) => v.toLocaleString() },
    { cat: "receiving",key: "td",   label: "Rec TD" },
    { cat: "passing",  key: "yds",  label: "Pass Yds",   fmt: (v) => v.toLocaleString() },
    { cat: "passing",  key: "td",   label: "Pass TD" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGrade(stars: number, rank: number): { label: string; color: string; ring: string } {
  if (stars >= 5 && rank <= 10)  return { label: "ELITE", color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10", ring: "ring-[#F4D06F]/20" };
  if (stars >= 5)                return { label: "A+",    color: "text-amber-400 border-amber-400/50 bg-amber-400/10", ring: "ring-amber-400/20" };
  if (stars >= 4 && rank <= 50)  return { label: "A",     color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10", ring: "ring-emerald-400/20" };
  if (stars >= 4)                return { label: "A−",    color: "text-sky-400 border-sky-400/50 bg-sky-400/10", ring: "ring-sky-400/20" };
  if (stars >= 3 && rank <= 300) return { label: "B+",    color: "text-violet-400 border-violet-400/50 bg-violet-400/10", ring: "ring-violet-400/20" };
  if (stars >= 3)                return { label: "B",     color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10", ring: "ring-zinc-400/10" };
  return                                { label: "C",     color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10", ring: "ring-zinc-500/10" };
}

function yearLabel(year: number | null, recruitYear: number): string {
  // year from 2025 roster (1=Fr,2=So,3=Jr,4=Sr). In 2026 they're one year further.
  const yearsIn = 2026 - recruitYear;
  if (yearsIn === 1) return "Sophomore";
  if (yearsIn === 2) return "Junior";
  if (yearsIn === 3) return "Senior";
  if (yearsIn === 4) return "5th Year";
  return "Freshman";
}

function statVal(
  statsByYear: StatsByYear,
  year: number,
  cat: string,
  key: string
): number | null {
  return statsByYear[year]?.[cat]?.[key] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-[16px] leading-none ${i < count ? "text-amber-400" : "text-zinc-700 dark:text-zinc-800"}`}>★</span>
      ))}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{value || "—"}</p>
    </div>
  );
}

function StatTable({ statsByYear, position }: { statsByYear: StatsByYear; position: string }) {
  const years = Object.keys(statsByYear).map(Number).sort();
  if (years.length === 0) return null;

  const rows = STAT_CONFIG[position] ?? STAT_CONFIG.ATH;

  // Only include rows where at least one year has data
  const activeRows = rows.filter((row) =>
    years.some((y) => statVal(statsByYear, y, row.cat, row.key) !== null)
  );

  if (activeRows.length === 0) return null;

  // Group rows by category for visual separation
  let lastCat = "";

  return (
    <div className="overflow-hidden">
      {/* Year header */}
      <div className="grid gap-0 border-b border-zinc-100 dark:border-zinc-800/40" style={{ gridTemplateColumns: `1fr repeat(${years.length}, 5rem)` }}>
        <div className="px-4 py-2" />
        {years.map((y) => (
          <div key={y} className="px-3 py-2 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">{y}</span>
          </div>
        ))}
      </div>

      {activeRows.map((row, idx) => {
        const isNewCat = row.cat !== lastCat;
        lastCat = row.cat;
        return (
          <>
            {isNewCat && idx > 0 && (
              <div key={`sep-${row.cat}`} className="border-t border-zinc-100 dark:border-zinc-800/40" />
            )}
            {isNewCat && (
              <div
                key={`hdr-${row.cat}`}
                className="grid px-4 py-1.5 bg-zinc-50/80 dark:bg-zinc-900/40"
                style={{ gridTemplateColumns: `1fr repeat(${years.length}, 5rem)` }}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-600">
                  {row.cat}
                </span>
                {years.map((y) => <div key={y} />)}
              </div>
            )}
            <div
              key={`${row.cat}-${row.key}`}
              className="grid items-center hover:bg-zinc-50/60 dark:hover:bg-zinc-800/10 transition-colors"
              style={{ gridTemplateColumns: `1fr repeat(${years.length}, 5rem)` }}
            >
              <div className="px-4 py-2">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-500">{row.label}</span>
              </div>
              {years.map((y) => {
                const v = statVal(statsByYear, y, row.cat, row.key);
                return (
                  <div key={y} className="px-3 py-2 text-center">
                    {v !== null ? (
                      <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                        {row.fmt ? row.fmt(v) : v}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })}
    </div>
  );
}

function CollegeAvatar({
  position,
  teamColor,
  athleteId,
  name,
}: {
  position: string;
  teamColor?: string | null;
  athleteId: string;
  name: string;
}) {
  const [err, setErr] = useState(false);
  const posColor = POS_COLOR[position] ?? "text-zinc-400 border-zinc-600/30 bg-zinc-600/10";
  const showPhoto = !err;

  return (
    <div
      className={`h-20 w-20 rounded-2xl shrink-0 shadow-md overflow-hidden border-2 ${showPhoto ? "border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/80" : posColor}`}
      style={!showPhoto && teamColor ? { borderColor: `${teamColor}60`, backgroundColor: `${teamColor}15` } : {}}
    >
      {showPhoto ? (
        <Image
          src={`https://a.espncdn.com/i/headshots/college-football/players/full/${athleteId}.png`}
          alt={name}
          width={80}
          height={80}
          className="object-cover object-top w-full h-full"
          onError={() => setErr(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-extrabold text-xl ${posColor}`}
          style={teamColor ? { color: teamColor } : {}}
        >
          {position.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProspectProfilePage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  // Basic info from URL params (render immediately)
  const name         = sp.get("name") ?? "Unknown Prospect";
  const position     = sp.get("pos") ?? "ATH";
  const stars        = parseInt(sp.get("stars") ?? "0");
  const rank         = parseInt(sp.get("rank") ?? "9999");
  const team         = sp.get("team") ?? null;
  const highSchool   = sp.get("hs") ?? null;
  const city         = sp.get("city") ?? null;
  const state        = sp.get("state") ?? null;
  const height       = sp.get("height") ?? null;
  const weight       = sp.get("weight") ?? null;
  const rating       = parseFloat(sp.get("rating") ?? "0") || null;
  const recruitYear  = parseInt(sp.get("recruitYear") ?? "2023");
  const nflDraftYear = parseInt(sp.get("nflDraftYear") ?? "2027");

  // Enhanced data from API
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);

  const starKey = `cfbd-${athleteId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("scoutingStarred");
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setStarred(arr.includes(starKey));
      }
    } catch {}
  }, [starKey]);

  const toggleStar = () => {
    setStarred((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem("scoutingStarred");
        const arr: string[] = raw ? JSON.parse(raw) : [];
        const updated = next ? [...new Set([...arr, starKey])] : arr.filter((id) => id !== starKey);
        localStorage.setItem("scoutingStarred", JSON.stringify(updated));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!athleteId) return;
    fetch(
      `/api/scouting/cfbd-profile?athleteId=${athleteId}&name=${encodeURIComponent(name)}&recruitYear=${recruitYear}`
    )
      .then((r) => r.json())
      .then((d) => { if (!d.error) setProfile(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [athleteId, name, recruitYear]);

  const grade = getGrade(stars, rank);
  const posColor = POS_COLOR[position] ?? "text-zinc-400 border-zinc-600/30 bg-zinc-600/10";
  const teamColor = profile?.playerInfo?.teamColor ?? null;
  const currentTeam = profile?.currentTeam ?? team;
  const jersey = profile?.playerInfo?.jersey ?? profile?.roster?.jersey ?? null;
  const classYear = yearLabel(profile?.roster?.year ?? null, recruitYear);
  const location = [city, state].filter(Boolean).join(", ");
  const hasStats = profile && Object.keys(profile.statsByYear).length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-10">

        {/* ── Nav ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Prospect Board
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <MdOutlineSportsFootball className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
            Scouting Report
          </div>
        </div>

        {/* ── Player Header ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-6 mb-4 overflow-hidden relative">
          {/* Team color accent strip */}
          {teamColor && (
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{ backgroundColor: teamColor }}
            />
          )}

          <div className="flex items-start gap-5">
            <CollegeAvatar position={position} teamColor={teamColor} athleteId={athleteId} name={name} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                    {name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${posColor}`}>
                      {position}
                    </span>
                    <StarDisplay count={stars} />
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide ring-1 ${grade.color} ${grade.ring}`}>
                      {grade.label}
                    </span>
                  </div>
                </div>

                {/* Star button */}
                <button
                  onClick={toggleStar}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all shrink-0 ${
                    starred
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-[#F4D06F]"
                      : "border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
                  }`}
                >
                  {starred
                    ? <HiStar className="h-3.5 w-3.5 text-amber-500 dark:text-[#F4D06F]" />
                    : <FiStar className="h-3.5 w-3.5" />}
                  {starred ? "Scouted" : "Scout"}
                </button>
              </div>

              {/* Draft + class info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Projected Draft</p>
                  <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">{nflDraftYear}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Recruit Class</p>
                  <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">{recruitYear}</p>
                </div>
                {rank < 9999 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">National Rank</p>
                    <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">#{rank}</p>
                  </div>
                )}
                {rating && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Rating</p>
                    <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">{rating.toFixed(4)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bio tiles ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoTile label="Height" value={height} />
          <InfoTile label="Weight" value={weight ? `${weight} lbs` : null} />
          <InfoTile label="Hometown" value={location || null} />
          <InfoTile label="High School" value={highSchool} />
        </div>

        {/* ── AI Scouting Report (Pro) ─────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 overflow-hidden mb-4 relative">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/40 flex items-center gap-2">
            <HiSparkles className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
              AI Scouting Report
            </p>
            <span className="ml-auto rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Pro
            </span>
          </div>

          <div className="relative px-5 py-5 select-none overflow-hidden">
            {/* Fake blurred content */}
            <div className="blur-xl pointer-events-none space-y-3" aria-hidden>
              <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {name} is one of the most intriguing prospects in the {nflDraftYear} class. As a {position} out of {currentTeam ?? team ?? "college"}, he brings an elite combination of size, speed, and football IQ that translates seamlessly to the next level. His {stars}-star recruiting profile understates what he brings to the table as a prospect.
              </p>
              <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                From a dynasty standpoint, his age-adjusted production curve and role in a pro-style offense give him a higher floor than his peers. His ability to separate at the top of routes and win contested catches make him a legitimate target in the first two rounds of upcoming rookie drafts.
              </p>
              <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                Key concerns include a thin frame that may require a developmental year before becoming a featured contributor. However, teams in need of a high-ceiling piece at {position} should prioritize him ahead of similar prospects. Comparable players include recent breakout contributors drafted in rounds 1–2.
              </p>
            </div>

            {/* Paywall overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-b from-white/10 via-white/90 to-white dark:from-zinc-900/10 dark:via-zinc-900/90 dark:to-zinc-900 pb-6 px-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center justify-center h-9 w-9 rounded-full border border-violet-500/30 bg-violet-500/10">
                  <FiLock className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Unlock AI Scouting Reports</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                    Get AI-powered dynasty insights for every prospect.
                  </p>
                </div>
                <button
                  disabled
                  className="rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold px-5 py-2 transition-colors opacity-80 cursor-not-allowed"
                >
                  Upgrade to Pro — Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── College info ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-5 mb-4 overflow-hidden relative">
          {teamColor && (
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: teamColor }} />
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-3">College</p>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800/50" />
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800/30" />
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {teamColor && (
                    <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                  )}
                  <p className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">
                    {currentTeam ?? team ?? "—"}
                  </p>
                </div>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {classYear}
                  {jersey && <> · <span className="font-semibold text-zinc-700 dark:text-zinc-300">#{jersey}</span></>}
                </p>
              </div>
              {team && currentTeam && currentTeam !== team && (
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">Transferred</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500">from {team}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Season Stats ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 overflow-hidden mb-4">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Season Stats</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">College Football Data</p>
            </div>
            {!loading && !hasStats && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">No stats yet</span>
            )}
          </div>

          {loading ? (
            <div className="p-5 animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800/50" />
                  <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800/40 ml-auto" />
                  {i < 2 && <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800/30" />}
                </div>
              ))}
            </div>
          ) : hasStats ? (
            <StatTable statsByYear={profile!.statsByYear} position={position} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <MdOutlineSportsFootball className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
              <p className="text-[12px] text-zinc-400 dark:text-zinc-600">
                {recruitYear >= 2025
                  ? "Stats for their first college season will appear here once the season concludes."
                  : "No stats found — player may not have played yet or transferred."}
              </p>
            </div>
          )}
        </div>

        {/* ── Recruiting Profile ───────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-4">Recruiting Profile</p>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1.5">Scout Grade</p>
              <StarDisplay count={stars} />
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1">
                {rating ? `${(rating * 100).toFixed(2)} composite` : ""}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1.5">Rankings</p>
              <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">
                #{rank} <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-500">national</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1.5">Signed With</p>
              <div className="flex items-center gap-1.5">
                {teamColor && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />}
                <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">{team ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-1.5">High School</p>
              <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">{highSchool ?? "—"}</p>
              {location && <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{location}</p>}
            </div>
          </div>
        </div>

        {/* ── Scouting Board ───────────────────────────────────────── */}
        <ScoutingBoard athleteId={athleteId} playerName={name} />

      </div>
    </div>
  );
}
