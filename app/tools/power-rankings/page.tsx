"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiChevronDown } from "react-icons/fi";

import type { League, TeamData, SleeperPick } from "./types";
import { KEY_POSITIONS, POS_TEXT } from "./types";
import { LeagueChart } from "./components/LeagueChart";
import { TeamTable }   from "./components/TeamTable";

// ─── Shared UI ────────────────────────────────────────────────────────────────
function ToggleGroup<T extends string | number | boolean>({
  label, options, value, onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-500">{label}</span>
      <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-900/60 p-0.5 gap-0.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
              value === opt.value
                ? "bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeagueDropdown({ leagues, selected, onSelect }: {
  leagues: League[];
  selected: League | null;
  onSelect: (l: League | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors min-w-[220px]"
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : "Select a league…"}
        </span>
        <FiChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-1.5 z-50">
          {leagues.map((l) => (
            <button
              key={l.id}
              onMouseDown={() => { onSelect(l); setOpen(false); }}
              className="w-full text-left rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{l.name}</p>
              {l.latestSeason && (
                <p className="text-[10px] text-zinc-500">{l.latestSeason.season} season</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-72 rounded-2xl bg-zinc-200 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/40" />
      <div className="h-96 rounded-2xl bg-zinc-200 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/40" />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerValue   = { name: string; position: string; team: string; value: number; trend: number; age: number | null };
type SleeperRoster = { roster_id: number; owner_id: string; players: string[] | null };
type SleeperUser   = { user_id: string; display_name: string; avatar: string | null };

const ROUND_NAMES = ["1st", "2nd", "3rd", "4th", "5th"];
const pickFcId    = (p: SleeperPick) => `FP_${p.season}_${p.round}`;
const pickName    = (p: SleeperPick) =>
  `${p.season} ${ROUND_NAMES[p.round - 1] ?? `Rd ${p.round}`}`;

function buildTeams(
  rosters: SleeperRoster[],
  userMap: Record<string, SleeperUser>,
  valueMap: Map<string, PlayerValue>,
  pickOwnership: Record<number, SleeperPick[]>,
  isDynasty: boolean,
): TeamData[] {
  const posRankLookup = new Map<string, number>();
  const playersByPos: Record<string, string[]> = { QB: [], RB: [], WR: [], TE: [] };
  for (const [id, pv] of valueMap.entries()) {
    if (!id.startsWith("FP_") && pv.position in playersByPos) {
      playersByPos[pv.position].push(id);
    }
  }
  for (const ids of Object.values(playersByPos)) {
    ids.sort((a, b) => (valueMap.get(b)?.value ?? 0) - (valueMap.get(a)?.value ?? 0));
    ids.forEach((id, i) => posRankLookup.set(id, i + 1));
  }

  const raw = rosters.map((r) => {
    const user = r.owner_id ? (userMap[r.owner_id] ?? null) : null;
    let totalValue = 0;
    const posValues: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    const byPos: Record<string, { id: string; name: string; value: number; posRank: number }[]> = {
      QB: [], RB: [], WR: [], TE: [],
    };

    for (const id of r.players ?? []) {
      const entry = valueMap.get(id);
      if (!entry) continue;
      const pos = entry.position;
      const val = entry.value;
      totalValue += val;
      if (pos in posValues) {
        posValues[pos] += val;
        byPos[pos].push({ id, name: entry.name, value: val, posRank: posRankLookup.get(id) ?? 0 });
      }
    }

    for (const pos of KEY_POSITIONS) byPos[pos].sort((a, b) => b.value - a.value);

    let picksValue = 0;
    const picks: { key: string; name: string; value: number }[] = [];
    if (isDynasty) {
      for (const pick of pickOwnership[r.roster_id] ?? []) {
        const entry = valueMap.get(pickFcId(pick));
        const val   = entry?.value ?? 0;
        picksValue += val;
        picks.push({ key: `${pick.season}_${pick.round}_${pick.originalRosterId}`, name: pickName(pick), value: val });
        totalValue += val;
      }
      picks.sort((a, b) => b.value - a.value);
    }

    return {
      rosterId:    r.roster_id,
      userId:      r.owner_id ?? "",
      displayName: user?.display_name ?? `Team ${r.roster_id}`,
      avatar:      user?.avatar ?? null,
      totalValue,
      posValues,
      topByPos:    byPos,
      picksValue,
      picks,
      overallRank: 0,
      posRanks:    {} as Record<string, number>,
      picksRank:   0,
    };
  });

  raw.sort((a, b) => b.totalValue - a.totalValue);
  raw.forEach((t, i) => { t.overallRank = i + 1; });

  for (const pos of KEY_POSITIONS) {
    const sorted = [...raw].sort((a, b) => (b.posValues[pos] ?? 0) - (a.posValues[pos] ?? 0));
    sorted.forEach((t, i) => { t.posRanks[pos] = i + 1; });
  }

  const picksSorted = [...raw].sort((a, b) => b.picksValue - a.picksValue);
  picksSorted.forEach((t, i) => { t.picksRank = i + 1; });

  return raw;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PowerRankingsPage() {
  const router = useRouter();
  const [isDynasty, setIsDynasty] = useState(true);
  const [numQbs, setNumQbs]       = useState<1 | 2>(1);
  const [ppr, setPpr]             = useState<0 | 0.5 | 1>(1);
  const [valueMap, setValueMap]   = useState<Map<string, PlayerValue>>(new Map());
  const [fcLoading, setFcLoading] = useState(false);

  const [leagues, setLeagues]               = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [rosters, setRosters]               = useState<SleeperRoster[]>([]);
  const [userMap, setUserMap]               = useState<Record<string, SleeperUser>>({});
  const [pickOwnership, setPickOwnership]   = useState<Record<number, SleeperPick[]>>({});
  const [leagueLoading, setLeagueLoading]   = useState(false);

  useEffect(() => {
    fetch("/api/my-leagues")
      .then((r) => r.json())
      .then((d) => setLeagues(d.leagues ?? []));
  }, []);

  useEffect(() => {
    setFcLoading(true);
    fetch(`/api/trade-analyzer/values?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}`)
      .then((r) => r.json())
      .then((body: { map?: Record<string, PlayerValue> }) => {
        if (body?.map) setValueMap(new Map(Object.entries(body.map)));
      })
      .catch((e) => console.error("[values]", e))
      .finally(() => setFcLoading(false));
  }, [isDynasty, numQbs, ppr]);

  useEffect(() => {
    setRosters([]); setUserMap({}); setPickOwnership({});
    const sleeperLeagueId = selectedLeague?.latestSeason?.sleeperLeagueId;
    if (!sleeperLeagueId) return;
    setLeagueLoading(true);
    Promise.all([
      fetch(`/api/sleeper/rosters/${sleeperLeagueId}`).then((r) => r.json()),
      fetch(`/api/sleeper/league/${sleeperLeagueId}/users`).then((r) => r.json()),
      fetch(`/api/sleeper/league/${sleeperLeagueId}/picks`).then((r) => r.json()),
    ])
      .then(([rosterData, userData, picksData]: [SleeperRoster[], SleeperUser[], Record<string, SleeperPick[]>]) => {
        if (Array.isArray(rosterData)) setRosters(rosterData);
        if (Array.isArray(userData)) {
          setUserMap(Object.fromEntries(userData.map((u) => [u.user_id, u])));
        }
        if (picksData && typeof picksData === "object") {
          const numeric: Record<number, SleeperPick[]> = {};
          for (const [k, v] of Object.entries(picksData)) numeric[Number(k)] = v;
          setPickOwnership(numeric);
        }
      })
      .catch((e) => console.error("[league fetch]", e))
      .finally(() => setLeagueLoading(false));
  }, [selectedLeague]);

  const teams: TeamData[] = useMemo(() => {
    if (rosters.length === 0 || valueMap.size === 0) return [];
    return buildTeams(rosters, userMap, valueMap, pickOwnership, isDynasty);
  }, [rosters, userMap, valueMap, pickOwnership, isDynasty]);

  const loading  = fcLoading || leagueLoading;
  const hasLeague = selectedLeague !== null;
  const hasData   = teams.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
            Tools
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Power Rankings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            See where every team stands — {isDynasty ? "dynasty long-term value" : "redraft win-now value"}.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-600">
            Values powered by{" "}
            <a href="https://fantasycalc.com" target="_blank" rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors">
              FantasyCalc
            </a>
          </p>
        </div>

        {/* Settings */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <ToggleGroup
              label="Format"
              options={[{ label: "Dynasty", value: true }, { label: "Win Now", value: false }]}
              value={isDynasty}
              onChange={(v) => setIsDynasty(v as boolean)}
            />
            <ToggleGroup
              label="QB Settings"
              options={[{ label: "1QB", value: 1 }, { label: "Superflex", value: 2 }]}
              value={numQbs}
              onChange={(v) => setNumQbs(v as 1 | 2)}
            />
            <ToggleGroup
              label="Scoring"
              options={[
                { label: "Full PPR", value: 1 },
                { label: "Half PPR", value: 0.5 },
                { label: "Standard", value: 0 },
              ]}
              value={ppr}
              onChange={(v) => setPpr(v as 0 | 0.5 | 1)}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">League</span>
              <LeagueDropdown leagues={leagues} selected={selectedLeague} onSelect={setSelectedLeague} />
            </div>
          </div>
          {loading && (
            <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 dark:border-t-amber-400 animate-spin inline-block" />
              {leagueLoading ? "Loading rosters…" : "Loading player values…"}
            </p>
          )}
        </div>

        {/* Content */}
        {!hasLeague ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800/60 px-5 py-16 text-center">
            <p className="text-base font-semibold text-zinc-500">Select a league to get started</p>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-600">
              We'll rank every team by cumulative dynasty value and break down each position
            </p>
          </div>
        ) : loading && !hasData ? (
          <Skeleton />
        ) : hasData ? (
          <div className="flex flex-col gap-6">
            <LeagueChart teams={teams} />
            <TeamTable teams={teams} isDynasty={isDynasty} />
          </div>
        ) : null}

      </div>
    </div>
  );
}
