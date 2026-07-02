"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSearch, FiUsers } from "react-icons/fi";
import { CompareCard, type ComparePlayer, type GameOdds, type PlayerProps } from "./components/CompareCard";
import { FactorsList } from "./components/FactorsList";
import { VoteSection } from "./components/VoteSection";
import { GateMatchup } from "./components/GateMatchup";

const MAX_PLAYERS = 4;

const POSITION_COLOR: Record<string, string> = {
  QB:  "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB:  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR:  "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE:  "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
  K:   "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
  DEF: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40",
};

type SearchResult = {
  id: string; full_name: string | null; position: string | null; team: string | null; age?: number | null; injury_status?: string | null;
};

type NflState = { week: number; display_week: number; season: string; season_type: string };

type ProjectionEntry = { pts_ppr: number; pts_half_ppr: number; pts_std: number };

// ─── Shared UI ────────────────────────────────────────────────────────────────
function ToggleGroup<T extends string | number>({
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

type PlayerStatEntry = { ydsPerGame: number | null; avgPts: number | null };

function ydsLabel(pos: string | null) {
  if (pos === "QB") return "Pass Yds/G";
  if (pos === "RB") return "Rush Yds/G";
  return "Rec Yds/G";
}

// ─── Player Search ─────────────────────────────────────────────────────────────
function PlayerSearch({
  projectionMap,
  ppr,
  excluded,
  onAdd,
  disabled,
  scheduleMap,
}: {
  projectionMap: Record<string, ProjectionEntry>;
  ppr: 0 | 0.5 | 1;
  excluded: string[];
  onAdd: (p: ComparePlayer) => void;
  disabled: boolean;
  scheduleMap: Record<string, string>;
}) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [open, setOpen]           = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  // playerId → stats (undefined = not fetched, null = loading, object = loaded)
  const [statsCache, setStatsCache] = useState<Record<string, PlayerStatEntry | null>>({});
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/sleeper/players/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } finally { setSearching(false); }
    }, 250);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  // Fetch season stats for each search result (skeletons for uncached)
  useEffect(() => {
    if (results.length === 0) return;
    const uncached = results.filter((r) => !(r.id in statsCache));
    if (uncached.length === 0) return;

    // Mark them all as loading
    setStatsCache((prev) => {
      const next = { ...prev };
      for (const r of uncached) next[r.id] = null;
      return next;
    });

    for (const r of uncached) {
      fetch(`/api/players/${r.id}/season-stats?season=${STATS_SEASON}`)
        .then((res) => res.json())
        .then((data) => {
          const gp = data?.gp ?? 0;
          const yds =
            r.position === "QB" ? (data?.pass_yd ?? 0) :
            r.position === "RB" ? (data?.rush_yd ?? 0) :
            (data?.rec_yd ?? 0);
          const ydsPerGame = gp > 0 ? Math.round((yds / gp) * 10) / 10 : null;
          const avgPts     = gp > 0 ? Math.round(((data?.pts_ppr ?? 0) / gp) * 10) / 10 : null;
          setStatsCache((prev) => ({ ...prev, [r.id]: { ydsPerGame, avgPts } }));
        })
        .catch(() => {
          setStatsCache((prev) => ({ ...prev, [r.id]: { ydsPerGame: null, avgPts: null } }));
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const filtered = results.filter((r) => !excluded.includes(r.id));

  const getPts = (id: string) => {
    const p = projectionMap[id];
    if (!p) return null;
    if (ppr === 1)   return p.pts_ppr;
    if (ppr === 0.5) return p.pts_half_ppr;
    return p.pts_std;
  };

  const handleSelect = (r: SearchResult) => {
    const pts = getPts(r.id) ?? 0;
    onAdd({
      sleeperId:    r.id,
      name:         r.full_name ?? r.id,
      position:     r.position ?? "",
      team:         r.team ?? "",
      projectedPts: pts,
      age:          r.age ?? null,
      injuryStatus: r.injury_status ?? null,
    });
    setQuery(""); setResults([]); setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1)); }
    if (e.key === "Enter" && highlighted >= 0) handleSelect(filtered[highlighted]);
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <FiSearch className="absolute left-4 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => filtered.length > 0 && setOpen(true)}
          disabled={disabled}
          placeholder={disabled ? `Max ${MAX_PLAYERS} players reached` : "Search for a player to compare…"}
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 pl-10 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 dark:focus:border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        />
        {searching && (
          <span className="absolute right-4 h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-amber-500 animate-spin" />
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/60 p-1.5 z-50">
          <ul>
            {filtered.map((r, i) => {
              const pts      = getPts(r.id);
              const posClass = POSITION_COLOR[r.position ?? ""] ?? POSITION_COLOR["DEF"];
              const stats    = statsCache[r.id]; // null = loading, object = loaded, undefined = not started
              const opponent = r.team ? scheduleMap[r.team] : null;
              const isHl     = i === highlighted;

              return (
                <li key={r.id}>
                  <button
                    onMouseDown={() => handleSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isHl ? "bg-zinc-100 dark:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <span className={`shrink-0 mt-0.5 rounded-full border px-1.5 py-px text-[9px] font-bold ${posClass}`}>
                      {r.position}
                    </span>

                    {/* Name + stats row */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.full_name}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {/* Team · opponent */}
                        <span className="text-[10px] text-zinc-500">
                          {r.team ?? "FA"}
                          {opponent ? <span className="text-zinc-400 dark:text-zinc-600"> vs {opponent}</span> : ""}
                        </span>

                        {/* Yds/G */}
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">·</span>
                        {stats === null ? (
                          <span className="h-2.5 w-12 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse inline-block" />
                        ) : stats ? (
                          <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                            {stats.ydsPerGame !== null ? `${stats.ydsPerGame.toFixed(0)} ${ydsLabel(r.position ?? null)}` : "—"}
                          </span>
                        ) : null}

                        {/* Avg pts/g */}
                        {stats && stats.avgPts !== null && (
                          <>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600">·</span>
                            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                              {stats.avgPts.toFixed(1)} pts/g
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Projected pts this week */}
                    <div className="shrink-0 text-right">
                      {pts != null && pts > 0 ? (
                        <>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">{pts.toFixed(1)}</span>
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wide">proj</p>
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">No proj.</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const STATS_SEASON = 2025;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StartSitPage() {
  const router = useRouter();
  const [ppr, setPpr]           = useState<0 | 0.5 | 1>(1);
  const [nflState, setNflState] = useState<NflState | null>(null);
  // null = unknown (checking localStorage), false = gate showing, true = cleared
  const [gateCleared, setGateCleared] = useState<boolean | null>(null);
  const [projectionMap, setProjectionMap] = useState<Record<string, ProjectionEntry>>({});
  const [projLoading, setProjLoading]     = useState(false);
  const [projStale, setProjStale]         = useState(false);
  const [players, setPlayers]   = useState<ComparePlayer[]>([]);

  // team → opponent map for the current week
  const [scheduleMap, setScheduleMap] = useState<Record<string, string>>({});
  const scheduleRef = useRef<Record<string, string>>({});
  // team → DraftKings game odds
  const [oddsMap, setOddsMap] = useState<Record<string, GameOdds>>({});
  const oddsRef = useRef<Record<string, GameOdds>>({});
  // tracks which playerIds have already had supplemental data fetched
  const fetchedRef  = useRef<Set<string>>(new Set());

  // Fetch current NFL week — gate visibility is managed per-pair in GateMatchup
  useEffect(() => {
    fetch("/api/start-sit/nfl-state")
      .then((r) => r.json())
      .then((d: NflState) => {
        // Normalize display_week — Sleeper returns 0 during some off-season states
        const effectiveWeek = Math.max(d.display_week ?? 1, 1);
        const normalized = { ...d, display_week: effectiveWeek };
        setNflState(normalized);
        setGateCleared(false); // always show gate; GateMatchup fast-skips if pair already voted
      })
      .catch(() => setGateCleared(true)); // can't show gate without knowing the week
  }, []);

  const handleGateUnlocked = () => {
    setGateCleared(true);
  };

  // Fetch projections when week/season is known
  useEffect(() => {
    if (!nflState) return;
    setProjLoading(true);
    setProjStale(false);
    fetch(`/api/start-sit/projections?week=${nflState.display_week}&season=${nflState.season}`)
      .then((r) => r.json())
      .then((body: { projections?: Record<string, ProjectionEntry>; stale?: boolean }) => {
        if (body?.projections) {
          setProjectionMap(body.projections);
          setProjStale(!!body.stale);
          // Re-hydrate already-added players with fresh projected pts
          setPlayers((prev) => prev.map((p) => {
            const entry = body.projections![p.sleeperId];
            const pts = entry
              ? ppr === 1 ? entry.pts_ppr : ppr === 0.5 ? entry.pts_half_ppr : entry.pts_std
              : p.projectedPts;
            return { ...p, projectedPts: pts };
          }));
        }
      })
      .catch(() => setProjStale(true))
      .finally(() => setProjLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nflState]);

  // Fetch current week's opponent schedule
  useEffect(() => {
    if (!nflState) return;
    fetch(`/api/start-sit/schedule?week=${nflState.display_week}&season=${nflState.season}`)
      .then((r) => r.json())
      .then((d: { schedule?: Record<string, string>; odds?: Record<string, GameOdds> }) => {
        if (d.schedule) {
          scheduleRef.current = d.schedule;
          setScheduleMap(d.schedule);
        }
        if (d.odds) {
          oddsRef.current = d.odds;
          setOddsMap(d.odds);
        }
      })
      .catch(() => {});
  }, [nflState]);

  // Re-compute projected pts when PPR changes
  useEffect(() => {
    if (Object.keys(projectionMap).length === 0) return;
    setPlayers((prev) => prev.map((p) => {
      const entry = projectionMap[p.sleeperId];
      if (!entry) return p;
      const pts = ppr === 1 ? entry.pts_ppr : ppr === 0.5 ? entry.pts_half_ppr : entry.pts_std;
      return { ...p, projectedPts: pts };
    }));
  }, [ppr, projectionMap]);

  // Fetch supplemental stats (yds/game, def-vs-pos) for newly added players
  useEffect(() => {
    for (const player of players) {
      if (fetchedRef.current.has(player.sleeperId)) continue;
      fetchedRef.current.add(player.sleeperId);

      const opponent = player.team ? (scheduleRef.current[player.team] ?? null) : null;

      (async () => {
        const [statsData, dvpData, propsData] = await Promise.all([
          fetch(`/api/players/${player.sleeperId}/season-stats?season=${STATS_SEASON}`)
            .then((r) => r.json())
            .catch(() => ({})),
          opponent && player.position
            ? fetch(`/api/start-sit/def-vs-pos?team=${opponent}&pos=${player.position}&season=${STATS_SEASON}`)
                .then((r) => r.json())
                .catch(() => null)
            : Promise.resolve(null),
          player.name && player.team && player.position
            ? fetch(`/api/start-sit/player-props?name=${encodeURIComponent(player.name)}&team=${encodeURIComponent(player.team)}&pos=${encodeURIComponent(player.position)}`)
                .then((r) => r.json())
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        const gp = statsData?.gp ?? 0;
        const yds =
          player.position === "QB"
            ? (statsData?.pass_yd ?? 0)
            : player.position === "RB"
            ? (statsData?.rush_yd ?? 0)
            : (statsData?.rec_yd ?? 0);
        const ydsPerGame    = gp > 0 ? Math.round((yds / gp) * 10) / 10 : null;
        const avgPtsPerGame = gp > 0 ? Math.round(((statsData?.pts_ppr ?? 0) / gp) * 10) / 10 : null;
        const defVsPos      = dvpData?.avgPts ?? null;
        const gameOdds      = player.team ? (oddsRef.current[player.team] ?? null) : null;
        const props: PlayerProps | null = propsData
          ? { ydsLine: propsData.ydsLine ?? null, ydsOver: propsData.ydsOver ?? null, ydsUnder: propsData.ydsUnder ?? null, anytimeTd: propsData.anytimeTd ?? null }
          : null;

        setPlayers((prev) =>
          prev.map((p) =>
            p.sleeperId === player.sleeperId
              ? { ...p, opponent, ydsPerGame, avgPtsPerGame, defVsPos, gameOdds, props }
              : p
          )
        );
      })();
    }
  }, [players]);

  const addPlayer = (p: ComparePlayer) => {
    if (players.length >= MAX_PLAYERS) return;
    setPlayers((prev) => [...prev, { ...p, ydsPerGame: undefined, defVsPos: undefined, avgPtsPerGame: undefined, gameOdds: undefined, props: undefined }]);
  };

  const removePlayer = (id: string) => setPlayers((prev) => prev.filter((p) => p.sleeperId !== id));

  const ranked = useMemo(
    () => [...players].sort((a, b) => b.projectedPts - a.projectedPts),
    [players]
  );

  const maxPts     = ranked[0]?.projectedPts ?? 1;
  const topPts     = ranked[0]?.projectedPts ?? 0;
  const excluded   = players.map((p) => p.sleeperId);
  const canCompare = ranked.length >= 2;

  // ── Gate: loading state ──
  if (gateCleared === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Gate: must vote before using the tool ──
  if (gateCleared === false && nflState) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
        <div className="mx-auto max-w-3xl px-4">
          <div className="pt-10 mb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
              Tools · Start / Sit
            </div>
          </div>
          <GateMatchup
            week={nflState.display_week}
            season={nflState.season}
            ppr={ppr}
            onUnlocked={handleGateUnlocked}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-10">

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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Start / Sit
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Compare 2–4 players · get a recommendation · see what the community thinks.
              </p>
            </div>
            {nflState && (
              <div className="flex flex-col items-end shrink-0">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Week {nflState.display_week}
                </span>
                <span className="mt-0.5 text-[10px] text-zinc-500">{nflState.season} season</span>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-4 mb-5">
          <div className="flex flex-wrap items-end gap-4">
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
          </div>
          {projLoading && (
            <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 animate-spin inline-block" />
              Loading Week {nflState?.display_week} projections…
            </p>
          )}
          {!projLoading && projStale && (
            <p className="mt-3 text-[11px] text-amber-500/80 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Projections may be from cache — Sleeper was unreachable.
            </p>
          )}
          {!projLoading && !projStale && Object.keys(projectionMap).length === 0 && nflState && (
            <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-600">
              No projections found for Week {nflState.display_week}. This may be the off-season.
            </p>
          )}
        </div>

        {/* Search */}
        <div className="mb-5">
          <PlayerSearch
            projectionMap={projectionMap}
            ppr={ppr}
            excluded={excluded}
            onAdd={addPlayer}
            disabled={players.length >= MAX_PLAYERS}
            scheduleMap={scheduleMap}
          />
          {players.length === 1 && (
            <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
              Add one more player to compare
            </p>
          )}
          {players.length === 0 && (
            <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-600">
              Search up to {MAX_PLAYERS} players — we'll rank by projected pts and show the community vote
            </p>
          )}
        </div>

        {/* Empty state */}
        {players.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800/60 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60">
              <FiUsers className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">No players added yet</p>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-600">
              Try searching Jahmyr Gibbs, Omarion Hampton, etc.
            </p>
          </div>
        )}

        {/* Single player (needs one more) */}
        {players.length === 1 && (
          <div className="flex flex-col gap-3">
            <CompareCard
              player={ranked[0]}
              rank={1}
              maxPts={maxPts}
              gapToFirst={null}
              onRemove={removePlayer}
            />
          </div>
        )}

        {/* Comparison + votes */}
        {canCompare && (
          <div className="flex flex-col gap-5">
            {/* Header row */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-600">
                {ranked.length} Players · Ranked by Projected Pts
              </span>
              <button
                onClick={() => setPlayers([])}
                className="text-[10px] font-semibold text-zinc-400 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Ranked comparison cards */}
            <div className="flex flex-col gap-3">
              {ranked.map((player, i) => (
                <CompareCard
                  key={player.sleeperId}
                  player={player}
                  rank={i + 1}
                  maxPts={maxPts}
                  gapToFirst={i === 0 ? null : topPts - player.projectedPts}
                  onRemove={removePlayer}
                />
              ))}
              {players.length < MAX_PLAYERS && (
                <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 pt-1">
                  + Add up to {MAX_PLAYERS - players.length} more player{MAX_PLAYERS - players.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Decision factors list */}
            <FactorsList players={ranked} />

            {/* Community vote */}
            {nflState && (
              <VoteSection
                players={ranked}
                week={nflState.display_week}
                season={nflState.season}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
