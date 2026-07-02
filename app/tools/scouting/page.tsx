"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiArrowLeft, FiStar, FiUser, FiArrowUpRight, FiLock } from "react-icons/fi";
import { HiStar } from "react-icons/hi";
import { MdOutlineSportsFootball } from "react-icons/md";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_NFL_YEAR = 2026;
const FUTURE_YEARS = [2029, 2028, 2027] as const;
const NFL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;
const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;
const COLLEGE_POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "ATH"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type NFLProspect = {
  sleeperId: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  classYear: number;
  college: string | null;
  value: number;
  trend: number;
  redraftValue: number;
  tier: number | null;
  rank: number;
};

type DraftResult = {
  round: number;
  pick: number;
  overall: number;
  nflTeam: string;
  collegeTeam: string | null;
  preDraftRanking: number | null;
  preDraftGrade: number | null;
};

type CollegeProspect = {
  id: string;
  athleteId: string | null;
  name: string;
  position: string;
  highSchool: string | null;
  committedTo: string | null;
  city: string | null;
  state: string | null;
  stars: number | null;
  rating: number | null;
  nationalRank: number | null;
  height: string | null;
  weight: number | null;
  recruitYear: number;
  nflDraftYear: number;
  collegeYearLabel: string;
  rank: number;
};

// ─── Grade Helpers ────────────────────────────────────────────────────────────

type ScoutGrade = { label: string; color: string; ring: string };

function nflGrade(value: number): ScoutGrade {
  if (value >= 8500) return { label: "ELITE", color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10",  ring: "ring-[#F4D06F]/20" };
  if (value >= 6500) return { label: "A+",    color: "text-amber-400 border-amber-400/50 bg-amber-400/10",   ring: "ring-amber-400/20" };
  if (value >= 5000) return { label: "A",     color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10", ring: "ring-emerald-400/20" };
  if (value >= 3500) return { label: "A−",    color: "text-sky-400 border-sky-400/50 bg-sky-400/10",         ring: "ring-sky-400/20" };
  if (value >= 2200) return { label: "B+",    color: "text-violet-400 border-violet-400/50 bg-violet-400/10", ring: "ring-violet-400/20" };
  if (value >= 1200) return { label: "B",     color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",      ring: "ring-zinc-400/10" };
  return                     { label: "C",    color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10",      ring: "ring-zinc-500/10" };
}

function collegeGrade(stars: number | null, rank: number | null): ScoutGrade {
  const s = stars ?? 0;
  const r = rank ?? 9999;
  if (s >= 5 && r <= 10)  return { label: "ELITE", color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10", ring: "ring-[#F4D06F]/20" };
  if (s >= 5)             return { label: "A+",    color: "text-amber-400 border-amber-400/50 bg-amber-400/10", ring: "ring-amber-400/20" };
  if (s >= 4 && r <= 50)  return { label: "A",     color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10", ring: "ring-emerald-400/20" };
  if (s >= 4)             return { label: "A−",    color: "text-sky-400 border-sky-400/50 bg-sky-400/10", ring: "ring-sky-400/20" };
  if (s >= 3 && r <= 300) return { label: "B+",    color: "text-violet-400 border-violet-400/50 bg-violet-400/10", ring: "ring-violet-400/20" };
  if (s >= 3)             return { label: "B",     color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10", ring: "ring-zinc-400/10" };
  return                         { label: "C",     color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10", ring: "ring-zinc-500/10" };
}

// ─── Position Colors ──────────────────────────────────────────────────────────

const POS_COLOR: Record<string, string> = {
  QB:  "text-red-400 border-red-500/30 bg-red-500/10",
  RB:  "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  WR:  "text-blue-400 border-blue-500/30 bg-blue-500/10",
  TE:  "text-orange-400 border-orange-500/30 bg-orange-500/10",
  ATH: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

// ─── Draft Helpers ────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function draftRoundColor(round: number): string {
  if (round === 1) return "text-[#F4D06F]";
  if (round === 2) return "text-emerald-400";
  if (round === 3) return "text-sky-400";
  if (round <= 5)  return "text-violet-400";
  return "text-zinc-400";
}

function DraftBadge({ d }: { d: DraftResult }) {
  const color = draftRoundColor(d.round);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tabular-nums ${color}`}>
      <span className="opacity-60">·</span>
      <span>Rd {d.round}</span>
      <span className="opacity-50">#</span>
      <span>{d.overall}</span>
      {d.nflTeam && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-semibold truncate max-w-[64px]">{d.nflTeam}</span>
        </>
      )}
    </span>
  );
}

// ─── Small Shared UI ──────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F4D06F]/15 border border-[#F4D06F]/40 text-[11px] font-extrabold text-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.2)]">1</span>;
  if (rank === 2) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-400/10 border border-zinc-400/30 text-[11px] font-extrabold text-zinc-300 dark:text-zinc-400">2</span>;
  if (rank === 3) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-900/20 border border-orange-600/30 text-[11px] font-extrabold text-orange-400">3</span>;
  return <span className="text-[11px] font-bold tabular-nums text-zinc-500 dark:text-zinc-600 w-6 text-center">{rank}</span>;
}

function GradeBadge({ grade }: { grade: ScoutGrade }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide ring-1 ${grade.color} ${grade.ring}`}>
      {grade.label}
    </span>
  );
}

function StarDisplay({ stars }: { stars: number | null }) {
  const count = Math.min(5, Math.max(0, stars ?? 0));
  return (
    <div className="flex gap-0.5 items-center">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-[13px] leading-none ${i < count ? "text-amber-400" : "text-zinc-700 dark:text-zinc-800"}`}>★</span>
      ))}
    </div>
  );
}

function PlayerAvatar({ sleeperId, name }: { sleeperId: string; name: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 overflow-hidden shrink-0 shadow-sm">
      {!err ? (
        <Image src={`https://sleepercdn.com/content/nfl/players/thumb/${sleeperId}.jpg`} alt={name} width={40} height={40}
          className="object-cover object-top w-full h-full" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FiUser className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
        </div>
      )}
    </div>
  );
}

function CollegeAvatar({ position, athleteId, name }: { position: string; athleteId: string | null; name: string }) {
  const [err, setErr] = useState(false);
  const posColor = POS_COLOR[position] ?? "text-zinc-400 border-zinc-600/30 bg-zinc-600/10";
  const showPhoto = athleteId && !err;
  return (
    <div className={`h-10 w-10 rounded-xl overflow-hidden shrink-0 shadow-sm border ${showPhoto ? "border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/80" : `${posColor}`}`}>
      {showPhoto ? (
        <Image
          src={`https://a.espncdn.com/i/headshots/college-football/players/full/${athleteId}.png`}
          alt={name}
          width={40}
          height={40}
          className="object-cover object-top w-full h-full"
          onError={() => setErr(true)}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center font-extrabold text-[12px] ${posColor}`}>
          {position.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function StarButton({ isStarred, onClick }: { isStarred: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${
        isStarred
          ? "text-amber-500 dark:text-[#F4D06F] bg-amber-500/10 hover:bg-amber-500/20"
          : "text-zinc-300 dark:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-500 dark:hover:text-zinc-500"
      }`}>
      {isStarred ? <HiStar className="h-4 w-4" /> : <FiStar className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Row Components ───────────────────────────────────────────────────────────

function NFLProspectRow({ p, starred, onStar, draftResult, showClassYear }: { p: NFLProspect; starred: boolean; onStar: () => void; draftResult: DraftResult | null; showClassYear?: boolean }) {
  const grade = nflGrade(p.value);
  const posColor = POS_COLOR[p.position] ?? "text-zinc-400 border-zinc-600/30 bg-zinc-600/10";
  return (
    <div className={`group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 ${starred ? "bg-amber-50/30 dark:bg-amber-500/[0.03]" : ""}`}>
      {/* Rank */}
      <div className="flex items-center justify-center w-6 shrink-0"><RankBadge rank={p.rank} /></div>

      {/* Avatar + player info */}
      <Link href={`/player/${p.sleeperId}`} className="flex items-center gap-2.5 flex-1 min-w-0">
        <PlayerAvatar sleeperId={p.sleeperId} name={p.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-950 dark:group-hover:text-white transition-colors leading-tight">{p.name}</p>
            <FiArrowUpRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 hidden sm:block" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold ${posColor}`}>{p.position}</span>
            {p.team && <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-medium">{p.team}</span>}
            {p.age !== null && <span className="text-[10px] text-zinc-400 dark:text-zinc-700">· {Math.floor(p.age)}y</span>}
            {p.college && <span className="hidden md:inline text-[10px] text-zinc-400 dark:text-zinc-700 truncate max-w-[90px]">· {p.college}</span>}
            {showClassYear && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-px text-[9px] font-bold text-violet-500 dark:text-violet-400">
                {p.classYear}
              </span>
            )}
            {draftResult && <DraftBadge d={draftResult} />}
          </div>
        </div>
      </Link>

      {/* Right stats */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex"><GradeBadge grade={grade} /></div>
        <div className="hidden sm:block text-right min-w-[3.5rem]">
          <p className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{p.value.toLocaleString()}</p>
          {p.redraftValue > 0 && <p className="text-[9px] text-zinc-400 dark:text-zinc-600 tabular-nums">RD {p.redraftValue.toLocaleString()}</p>}
        </div>
        <div className="hidden sm:block text-right min-w-[2.5rem]">
          {p.trend !== 0 ? (
            <span className={`text-[11px] font-bold tabular-nums ${p.trend > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {p.trend > 0 ? "+" : ""}{p.trend}
            </span>
          ) : <span className="text-[11px] text-zinc-300 dark:text-zinc-700">—</span>}
        </div>
        <StarButton isStarred={starred} onClick={onStar} />
      </div>
    </div>
  );
}

function CollegeProspectRow({ p, starred, onStar, showClassYear }: { p: CollegeProspect; starred: boolean; onStar: () => void; showClassYear?: boolean }) {
  const grade = collegeGrade(p.stars, p.nationalRank);
  const posColor = POS_COLOR[p.position] ?? "text-zinc-400 border-zinc-600/30 bg-zinc-600/10";
  const location = [p.city, p.state].filter(Boolean).join(", ");

  const profileParams = p.athleteId
    ? new URLSearchParams({
        name:        p.name,
        pos:         p.position,
        stars:       String(p.stars ?? 0),
        rank:        String(p.nationalRank ?? 9999),
        team:        p.committedTo ?? "",
        hs:          p.highSchool ?? "",
        city:        p.city ?? "",
        state:       p.state ?? "",
        height:      p.height ?? "",
        weight:      String(p.weight ?? ""),
        rating:      String(p.rating ?? ""),
        recruitYear: String(p.recruitYear),
        nflDraftYear:String(p.nflDraftYear),
      }).toString()
    : null;

  return (
    <div className={`group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 ${starred ? "bg-amber-50/30 dark:bg-amber-500/[0.03]" : ""}`}>
      {/* Rank */}
      <div className="flex items-center justify-center w-6 shrink-0">
        <RankBadge rank={p.rank} />
      </div>

      {/* Avatar + player info — link if athleteId available */}
      {profileParams ? (
        <Link
          href={`/tools/scouting/prospect/${p.athleteId}?${profileParams}`}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <CollegeAvatar position={p.position} athleteId={p.athleteId} name={p.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">{p.name}</p>
              <FiArrowUpRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 hidden sm:block" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold ${posColor}`}>{p.position}</span>
              {showClassYear && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-px text-[9px] font-bold text-sky-500 dark:text-sky-400">
                  {p.nflDraftYear}
                </span>
              )}
              {p.highSchool && <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-medium truncate max-w-[120px]">{p.highSchool}</span>}
              {location && <span className="text-[10px] text-zinc-400 dark:text-zinc-700">· {location}</span>}
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <CollegeAvatar position={p.position} athleteId={p.athleteId} name={p.name} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">{p.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold ${posColor}`}>{p.position}</span>
              {showClassYear && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-px text-[9px] font-bold text-sky-500 dark:text-sky-400">
                  {p.nflDraftYear}
                </span>
              )}
              {p.highSchool && <span className="text-[10px] text-zinc-500 dark:text-zinc-600 font-medium truncate max-w-[120px]">{p.highSchool}</span>}
              {location && <span className="text-[10px] text-zinc-400 dark:text-zinc-700">· {location}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Right stats */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Stars */}
        <div className="hidden md:block">
          <StarDisplay stars={p.stars} />
        </div>

        {/* Committed college */}
        <div className="hidden sm:block text-right min-w-[6rem] max-w-[6rem]">
          {p.committedTo ? (
            <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">{p.committedTo}</p>
          ) : (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">Uncommitted</p>
          )}
          {p.nationalRank && (
            <p className="text-[9px] text-zinc-400 dark:text-zinc-600 tabular-nums">#{p.nationalRank} overall</p>
          )}
        </div>

        <div className="hidden sm:flex"><GradeBadge grade={grade} /></div>

        <StarButton isStarred={starred} onClick={onStar} />
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProspectSkeleton() {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/30">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800/50 shrink-0" />
          <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800/50 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-36 rounded bg-zinc-200 dark:bg-zinc-800/50" />
            <div className="h-2.5 w-24 rounded bg-zinc-200 dark:bg-zinc-800/30" />
          </div>
          <div className="h-5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800/40 hidden sm:block" />
          <div className="h-3 w-14 rounded bg-zinc-200 dark:bg-zinc-800/30 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

// ─── Grade Legend ─────────────────────────────────────────────────────────────

const COLLEGE_GRADES = [
  { label: "ELITE", desc: "5★ top 10",  color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10" },
  { label: "A+",    desc: "5★",          color: "text-amber-400 border-amber-400/50 bg-amber-400/10" },
  { label: "A",     desc: "4★ top 50",   color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10" },
  { label: "A−",    desc: "4★",          color: "text-sky-400 border-sky-400/50 bg-sky-400/10" },
  { label: "B+",    desc: "3★ top 300",  color: "text-violet-400 border-violet-400/50 bg-violet-400/10" },
  { label: "B",     desc: "3★",          color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10" },
  { label: "C",     desc: "≤2★",         color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10" },
];

const NFL_GRADES = [
  { label: "ELITE", desc: "8,500+",  color: "text-[#F4D06F] border-[#F4D06F]/50 bg-[#F4D06F]/10" },
  { label: "A+",    desc: "6,500+",  color: "text-amber-400 border-amber-400/50 bg-amber-400/10" },
  { label: "A",     desc: "5,000+",  color: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10" },
  { label: "A−",    desc: "3,500+",  color: "text-sky-400 border-sky-400/50 bg-sky-400/10" },
  { label: "B+",    desc: "2,200+",  color: "text-violet-400 border-violet-400/50 bg-violet-400/10" },
  { label: "B",     desc: "1,200+",  color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10" },
  { label: "C",     desc: "< 1,200", color: "text-zinc-500 border-zinc-600/30 bg-zinc-700/10" },
];

function GradeLegend({ isFuture }: { isFuture: boolean }) {
  const grades = isFuture ? COLLEGE_GRADES : NFL_GRADES;
  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800/40 bg-white dark:bg-zinc-900/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-3">Scout Grade Key</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {grades.map((g) => (
          <div key={g.label} className="flex items-center gap-1.5">
            <span className={`rounded-full border px-2 py-px text-[9px] font-extrabold tracking-wide ${g.color}`}>{g.label}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{g.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScoutingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"dynasty" | "future">("dynasty");
  const [classYear, setClassYear] = useState<number | null>(null); // null = all for dynasty, default year for future
  const [position, setPosition] = useState("ALL");
  const [nflProspects, setNFLProspects] = useState<NFLProspect[]>([]);
  const [collegeProspects, setCollegeProspects] = useState<CollegeProspect[]>([]);
  const [collegeYearLabel, setCollegeYearLabel] = useState("");
  const [nflFiltered, setNflFiltered] = useState(0);
  const [draftMap, setDraftMap] = useState<Map<string, DraftResult>>(new Map());
  const [sortMode, setSortMode] = useState<"dynasty" | "draft">("dynasty");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const isFuture = mode === "future";
  const isAll = mode === "dynasty" && classYear === null;
  const posOptions = isFuture ? COLLEGE_POSITIONS : POSITIONS;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("scoutingStarred");
      if (raw) setStarred(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("scoutingStarred", JSON.stringify([...next]));
      return next;
    });
  };

  // Switch mode — both default to null (All)
  const switchMode = (next: "dynasty" | "future") => {
    setMode(next);
    setClassYear(null);
    if (next === "dynasty" && position === "ATH") setPosition("ALL");
    setSortMode("dynasty");
  };

  // Reset sort mode when class year changes
  useEffect(() => {
    setSortMode("dynasty");
  }, [classYear]);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (isFuture) {
      if (classYear === null) {
        // Fetch all future classes in parallel, merge and sort by rating
        Promise.all(
          [...FUTURE_YEARS].map((y) =>
            fetch(`/api/scouting/cfbd-prospects?nflDraftYear=${y}&position=${position}`)
              .then((r) => r.json())
              .then((d) => (d.prospects ?? []) as CollegeProspect[])
              .catch(() => [] as CollegeProspect[])
          )
        )
          .then((results) => {
            const merged = results.flat();
            merged.sort((a, b) => {
              if (b.rating !== null && a.rating !== null) return b.rating - a.rating;
              if (a.rating !== null) return -1;
              if (b.rating !== null) return 1;
              return (a.nationalRank ?? 9999) - (b.nationalRank ?? 9999);
            });
            setCollegeProspects(merged.map((p, i) => ({ ...p, rank: i + 1 })));
            setCollegeYearLabel("");
            setNflFiltered(0);
          })
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
      } else {
        fetch(`/api/scouting/cfbd-prospects?nflDraftYear=${classYear}&position=${position}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.error) throw new Error(d.error);
            setCollegeProspects(d.prospects ?? []);
            setCollegeYearLabel(d.collegeYearLabel ?? "");
            setNflFiltered(d.filtered ?? 0);
          })
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
      }
    } else {
      const yearParam = classYear === null ? "ALL" : String(classYear);
      Promise.all([
        fetch(`/api/scouting/prospects?classYear=${yearParam}&position=${position}`).then((r) => r.json()),
        classYear !== null
          ? fetch(`/api/scouting/cfbd-draft?year=${classYear}`).then((r) => r.json()).catch(() => ({ picks: [] }))
          : Promise.resolve({ picks: [] }),
      ])
        .then(([prospectData, draftData]) => {
          if (prospectData.error) throw new Error(prospectData.error);
          setNFLProspects(prospectData.prospects ?? []);

          const map = new Map<string, DraftResult>();
          if (Array.isArray(draftData.picks)) {
            for (const pick of draftData.picks) {
              map.set(pick.normalizedName as string, {
                round:            pick.round,
                pick:             pick.pick,
                overall:          pick.overall,
                nflTeam:          pick.nflTeam,
                collegeTeam:      pick.collegeTeam ?? null,
                preDraftRanking:  pick.preDraftRanking ?? null,
                preDraftGrade:    pick.preDraftGrade ?? null,
              });
            }
          }
          setDraftMap(map);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [mode, classYear, position]);

  // Displayed prospects — sorted by selected mode, re-ranked
  const nflSorted = (() => {
    const base = showStarredOnly
      ? nflProspects.filter((p) => starred.has(p.sleeperId))
      : nflProspects;

    if (sortMode === "draft" && draftMap.size > 0) {
      const sorted = [...base].sort((a, b) => {
        const da = draftMap.get(normalizeName(a.name))?.overall ?? 9999;
        const db = draftMap.get(normalizeName(b.name))?.overall ?? 9999;
        return da - db;
      });
      return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
    }
    return base;
  })();

  const nflDisplayed = nflSorted;

  const collegeDisplayed = showStarredOnly
    ? collegeProspects.filter((p) => starred.has(`cfbd-${p.athleteId ?? p.id}`))
    : collegeProspects;

  const displayCount = isFuture ? collegeDisplayed.length : nflDisplayed.length;
  const starredCount = starred.size;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-3">
            <MdOutlineSportsFootball className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
            Scouting
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Prospect Board</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-lg">
            {isFuture
              ? "College recruiting rankings for future NFL draft classes. Star players to track your targets before they go pro."
              : "Dynasty prospects across all NFL classes, ranked by dynasty value."}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">
            {isFuture ? (
              <>College recruiting data from <a href="https://collegefootballdata.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">CollegeFootballData</a></>
            ) : (
              <>Dynasty values powered by <a href="https://fantasycalc.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">FantasyCalc</a></>
            )}
          </p>
        </div>

        {/* ── Controls ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-5 mb-6 space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60 p-1 gap-1">
            <button
              onClick={() => switchMode("dynasty")}
              className={`flex-1 rounded-lg py-2.5 text-[12px] font-extrabold tracking-wide transition-all duration-150 ${
                mode === "dynasty"
                  ? "bg-white dark:bg-zinc-800/80 text-amber-700 dark:text-[#F4D06F] shadow-sm border border-zinc-200 dark:border-zinc-700/50"
                  : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Dynasty
            </button>
            <button
              onClick={() => switchMode("future")}
              className={`flex-1 rounded-lg py-2.5 text-[12px] font-extrabold tracking-wide transition-all duration-150 ${
                mode === "future"
                  ? "bg-white dark:bg-zinc-800/80 text-sky-600 dark:text-sky-300 shadow-sm border border-zinc-200 dark:border-zinc-700/50"
                  : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Future Prospects
            </button>
          </div>

          {/* Year filter */}
          {mode === "dynasty" ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">Class Year</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setClassYear(null)}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wide transition-all duration-150 ${
                    classYear === null
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-[#F4D06F] shadow-[0_0_12px_rgba(244,208,111,0.15)]"
                      : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  All
                </button>
                {NFL_YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setClassYear(y)}
                    className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wide transition-all duration-150 ${
                      classYear === y
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-[#F4D06F] shadow-[0_0_12px_rgba(244,208,111,0.15)]"
                        : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {y === CURRENT_NFL_YEAR ? `${y} ★` : String(y)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">Draft Class</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setClassYear(null)}
                  className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wide transition-all duration-150 ${
                    classYear === null
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.1)]"
                      : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  All
                </button>
                {FUTURE_YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setClassYear(y)}
                    className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wide transition-all duration-150 ${
                      classYear === y
                        ? "border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.1)]"
                        : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Position filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500">Position</span>
            <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-900/60 p-0.5 gap-0.5 w-fit">
              {posOptions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition-all duration-150 ${
                    position === pos
                      ? pos === "ALL"
                        ? isFuture
                          ? "bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40"
                          : "bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40"
                        : "bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-sm text-zinc-800 dark:text-zinc-200"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Starred toggle + Team Needs */}
          <div className="flex items-center gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/40 flex-wrap">
            <button
              onClick={() => setShowStarredOnly((v) => !v)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                showStarredOnly
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-[#F4D06F]"
                  : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <HiStar className={`h-3.5 w-3.5 ${showStarredOnly ? "text-amber-500 dark:text-[#F4D06F]" : "text-zinc-400 dark:text-zinc-600"}`} />
              Scouted Players
              {starredCount > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${showStarredOnly ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-zinc-200 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400"}`}>
                  {starredCount}
                </span>
              )}
            </button>

            {/* Fill by Team Needs — Pro placeholder */}
            <button
              disabled
              title="Coming soon with Pro membership"
              className="flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-violet-500/60 dark:text-violet-400/50 cursor-not-allowed select-none"
            >
              <FiLock className="h-3 w-3 shrink-0" />
              Fill by Team Needs
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Pro
              </span>
            </button>

            {showStarredOnly && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic w-full">
                {isFuture ? "Showing scouted players in this class · switch years to see others" : "Showing your scouted dynasty players"}
              </p>
            )}
          </div>
        </div>

        {/* ── Prospect Board ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">

          {/* Board header */}
          <div className={`px-5 py-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between ${
            isFuture
              ? "bg-gradient-to-r from-sky-950/30 to-zinc-900/30 dark:from-sky-950/50 dark:to-zinc-900/30"
              : isAll
              ? "bg-gradient-to-r from-violet-950/20 to-zinc-900/30 dark:from-violet-950/40 dark:to-zinc-900/30"
              : "bg-gradient-to-r from-zinc-50 to-zinc-100/60 dark:from-zinc-900/60 dark:to-zinc-900/30"
          }`}>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    {isFuture
                      ? classYear === null ? "Future" : "Projected"
                      : isAll ? "Dynasty" : "Class of"}
                  </span>
                  <span className={`text-xl font-extrabold tracking-tight ${
                    isFuture ? "text-sky-300"
                    : isAll ? "text-violet-400 dark:text-violet-300"
                    : "text-zinc-900 dark:text-zinc-50"
                  }`}>
                    {isFuture && classYear === null ? "All Prospects" : isAll ? "All Classes" : classYear}
                  </span>
                  {isFuture && classYear === null ? (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-sky-400">
                      2027–{FUTURE_YEARS[0]}
                    </span>
                  ) : isFuture ? (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-sky-400">
                      NFL Draft
                    </span>
                  ) : isAll ? (
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-violet-400">
                      2020–{CURRENT_NFL_YEAR}
                    </span>
                  ) : classYear === CURRENT_NFL_YEAR ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                      Active Rookies
                    </span>
                  ) : null}
                </div>
                {isFuture && classYear === null && (
                  <p className="text-[10px] text-sky-400/70 dark:text-sky-500/70 mt-0.5">
                    All future classes combined · ranked by recruiting rating
                  </p>
                )}
                {isFuture && classYear !== null && collegeYearLabel && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-sky-400/70 dark:text-sky-500/70">
                      Recruit Class {classYear - 4} · {collegeYearLabel} in 2026
                    </p>
                    {nflFiltered > 0 && (
                      <span className="rounded-full border border-zinc-600/30 bg-zinc-700/10 px-1.5 py-px text-[9px] font-semibold text-zinc-500 dark:text-zinc-600">
                        {nflFiltered} already in NFL
                      </span>
                    )}
                  </div>
                )}
                {!isFuture && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-0.5">
                    {isAll
                      ? "All classes combined · ranked by dynasty value"
                      : sortMode === "draft"
                      ? "Draft order · actual pick"
                      : "Dynasty value · ranked by FantasyCalc"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Sort toggle — only for specific drafted classes with draft data */}
              {!isFuture && !isAll && draftMap.size > 0 && (
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60 p-0.5 gap-0.5">
                  <button
                    onClick={() => setSortMode("dynasty")}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                      sortMode === "dynasty"
                        ? "bg-white dark:bg-zinc-800/80 text-amber-700 dark:text-[#F4D06F] shadow-sm border border-zinc-200 dark:border-zinc-700/50"
                        : "text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
                    }`}
                  >
                    Dynasty
                  </button>
                  <button
                    onClick={() => setSortMode("draft")}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                      sortMode === "draft"
                        ? "bg-white dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 shadow-sm border border-zinc-200 dark:border-zinc-700/50"
                        : "text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
                    }`}
                  >
                    Draft Order
                  </button>
                </div>
              )}
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 tabular-nums">
                {loading ? "—" : `${displayCount}`} prospects
              </span>
            </div>
          </div>

          {/* Column headers */}
          {!loading && (
            <div className="hidden sm:flex items-center px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/30 bg-zinc-50/80 dark:bg-zinc-900/40 gap-3">
              <span className="w-6 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-center shrink-0">
                {!isFuture && sortMode === "draft" ? "PK" : "#"}
              </span>
              <span className="flex-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                {isFuture ? "Prospect" : "Player"}
              </span>
              {isFuture ? (
                <>
                  <span className="hidden md:block text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 shrink-0">Stars</span>
                  <span className="hidden sm:block text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right min-w-[6rem] shrink-0">Committed</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 shrink-0">Grade</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 shrink-0">Grade</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right min-w-[3.5rem] shrink-0">Value</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-right min-w-[2.5rem] shrink-0">30d</span>
                </>
              )}
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 text-center w-7 shrink-0">★</span>
            </div>
          )}

          {/* Rows */}
          {loading ? (
            <ProspectSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm font-semibold text-red-500 dark:text-red-400">Failed to load prospects</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">{error}</p>
            </div>
          ) : displayCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 ring-1 ring-zinc-200 dark:ring-zinc-800/60">
                <MdOutlineSportsFootball className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  {showStarredOnly ? "No scouted players yet" : "No prospects found"}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                  {showStarredOnly ? "Hit the ★ on any prospect to add them to your board" : "Try a different class year or position filter"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/30">
              {isFuture
                ? collegeDisplayed.map((p) => (
                    <CollegeProspectRow
                      key={`${p.nflDraftYear}-${p.id}`}
                      p={p}
                      starred={starred.has(`cfbd-${p.athleteId ?? p.id}`)}
                      onStar={() => toggleStar(`cfbd-${p.athleteId ?? p.id}`)}
                      showClassYear={classYear === null}
                    />
                  ))
                : nflDisplayed.map((p) => (
                    <NFLProspectRow
                      key={p.sleeperId}
                      p={p}
                      starred={starred.has(p.sleeperId)}
                      onStar={() => toggleStar(p.sleeperId)}
                      draftResult={draftMap.get(normalizeName(p.name)) ?? null}
                      showClassYear={isAll}
                    />
                  ))}
            </div>
          )}

          {/* Board footer */}
          {!loading && displayCount > 0 && (
            <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/30 bg-zinc-50/60 dark:bg-zinc-900/30 flex items-center justify-between">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-700">
                {displayCount} prospects ·{" "}
                {isFuture
                  ? classYear === null ? "All future classes" : `Projected ${classYear} NFL Draft`
                  : isAll ? "All NFL classes" : `Class of ${classYear}`}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-700">
                {isFuture
                  ? classYear === null ? "Ranked by recruiting rating" : `Recruit Class ${classYear - 4}`
                  : "Ranked by dynasty value"}
              </p>
            </div>
          )}
        </div>

        {/* ── Grade Legend ────────────────────────────────────────── */}
        <GradeLegend isFuture={isFuture} />

      </div>
    </div>
  );
}
