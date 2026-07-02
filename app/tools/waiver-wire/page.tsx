"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiChevronDown, FiSearch } from "react-icons/fi";

import type { League } from "./types";
import { KEY_POSITIONS, POS_TEXT } from "./types";

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
      <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/40" />
      <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/40" />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerValue   = { name: string; position: string; team: string; value: number; trend: number; age: number | null };
type SleeperRoster = { roster_id: number; owner_id: string; players: string[] | null };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WaiverWirePage() {
  const router = useRouter();
  const [isDynasty, setIsDynasty] = useState(true);
  const [numQbs, setNumQbs]       = useState<1 | 2>(1);
  const [ppr, setPpr]             = useState<0 | 0.5 | 1>(1);
  const [valueMap, setValueMap]   = useState<Map<string, PlayerValue>>(new Map());
  const [fcLoading, setFcLoading] = useState(false);

  const [leagues, setLeagues]               = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [rosters, setRosters]               = useState<SleeperRoster[]>([]);
  const [leagueLoading, setLeagueLoading]   = useState(false);

  // Guest state
  const [isGuest, setIsGuest]                   = useState(false);
  const [guestUsername, setGuestUsername]       = useState("");
  const [guestLoading, setGuestLoading]         = useState(false);
  const [guestError, setGuestError]             = useState("");
  const guestInputRef                           = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/my-leagues")
      .then((r) => {
        if (r.status === 401) { setIsGuest(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setLeagues(d.leagues ?? []); });
  }, []);

  const lookupGuestLeagues = async () => {
    const username = guestUsername.trim();
    if (!username) return;
    setGuestLoading(true);
    setGuestError("");
    try {
      const userRes = await fetch(`/api/sleeper/user/${encodeURIComponent(username)}`);
      if (!userRes.ok) { setGuestError("Sleeper username not found"); return; }
      const user = await userRes.json();
      if (!user?.user_id) { setGuestError("Sleeper username not found"); return; }

      const leaguesRes = await fetch(
        `https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/2025`
      );
      const sleeperLeagues = await leaguesRes.json();
      if (!Array.isArray(sleeperLeagues) || sleeperLeagues.length === 0) {
        setGuestError("No 2025 leagues found for that username");
        return;
      }
      setLeagues(
        sleeperLeagues.map((l: any) => ({
          id: l.league_id,
          name: l.name,
          role: "member",
          latestSeason: { sleeperLeagueId: l.league_id, season: l.season },
        }))
      );
    } catch {
      setGuestError("Failed to load leagues — try again");
    } finally {
      setGuestLoading(false);
    }
  };

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
    setRosters([]);
    const sleeperLeagueId = selectedLeague?.latestSeason?.sleeperLeagueId;
    if (!sleeperLeagueId) return;
    setLeagueLoading(true);
    fetch(`/api/sleeper/rosters/${sleeperLeagueId}`)
      .then((r) => r.json())
      .then((data: SleeperRoster[]) => { if (Array.isArray(data)) setRosters(data); })
      .catch((e) => console.error("[rosters]", e))
      .finally(() => setLeagueLoading(false));
  }, [selectedLeague]);

  const rosteredIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rosters) for (const id of r.players ?? []) ids.add(id);
    return ids;
  }, [rosters]);

  type AvailablePlayer = PlayerValue & { id: string };

  const availablePlayers = useMemo<AvailablePlayer[]>(() => {
    if (valueMap.size === 0 || rosteredIds.size === 0) return [];
    const list: AvailablePlayer[] = [];
    for (const [id, pv] of valueMap.entries()) {
      if (!id.startsWith("FP_") && !rosteredIds.has(id) && (KEY_POSITIONS as readonly string[]).includes(pv.position)) {
        list.push({ ...pv, id });
      }
    }
    return list;
  }, [valueMap, rosteredIds]);

  const topWaiverByPos = useMemo(() => {
    const result: Record<string, AvailablePlayer[]> = {};
    for (const pos of KEY_POSITIONS) {
      result[pos] = availablePlayers.filter((p) => p.position === pos).sort((a, b) => b.value - a.value).slice(0, 5);
    }
    return result;
  }, [availablePlayers]);

  const risersByPos = useMemo(() => {
    const result: Record<string, AvailablePlayer[]> = {};
    for (const pos of KEY_POSITIONS) {
      result[pos] = availablePlayers.filter((p) => p.position === pos && p.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 5);
    }
    return result;
  }, [availablePlayers]);

  const loading   = fcLoading || leagueLoading;
  const hasLeague = selectedLeague !== null;
  const hasData   = availablePlayers.length > 0;

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
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Waiver Wire</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Best available pickups from your league — by value and trending up.
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
            {isGuest && leagues.length === 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Sleeper Username</span>
                <div className="flex gap-2">
                  <input
                    ref={guestInputRef}
                    value={guestUsername}
                    onChange={(e) => { setGuestUsername(e.target.value); setGuestError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && lookupGuestLeagues()}
                    placeholder="your_sleeper_name"
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-600 w-44"
                  />
                  <button
                    onClick={lookupGuestLeagues}
                    disabled={guestLoading || !guestUsername.trim()}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {guestLoading
                      ? <span className="h-3 w-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 animate-spin" />
                      : <FiSearch className="h-3 w-3" />}
                    {guestLoading ? "Loading…" : "Load"}
                  </button>
                </div>
                {guestError && <p className="text-[10px] text-red-500">{guestError}</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">League</span>
                <div className="flex items-center gap-2">
                  <LeagueDropdown leagues={leagues} selected={selectedLeague} onSelect={setSelectedLeague} />
                  {isGuest && (
                    <button
                      onClick={() => { setLeagues([]); setSelectedLeague(null); setGuestUsername(""); }}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
                    >
                      change
                    </button>
                  )}
                </div>
              </div>
            )}
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
            <p className="text-base font-semibold text-zinc-500">Select a league to see available players</p>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-600">
              We'll find the best unrostered players from your league's value sheet
            </p>
          </div>
        ) : loading && !hasData ? (
          <Skeleton />
        ) : hasData ? (
          <div className="flex flex-col gap-6">

            {/* Top Waiver Adds */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                    Top Waiver Adds
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-0.5">Highest value available · top 5 per position</p>
                </div>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-[#F4D06F]">
                  Top 5
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800/40">
                {KEY_POSITIONS.map((pos) => {
                  const players = topWaiverByPos[pos] ?? [];
                  return (
                    <div key={pos} className="divide-y divide-zinc-200 dark:divide-zinc-800/30">
                      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/30">
                        <span className={`rounded-full border px-2 py-px text-[9px] font-bold ${POS_TEXT[pos]}`}>{pos}</span>
                      </div>
                      {players.length > 0 ? (
                        players.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/20 transition-colors">
                            <span className="text-[10px] text-zinc-500 w-4 shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.name}</p>
                              {p.team && <p className="text-[10px] text-zinc-500">{p.team}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{p.value.toLocaleString()}</p>
                              {p.trend !== 0 && (
                                <p className={`text-[10px] font-semibold ${p.trend > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                  {p.trend > 0 ? "+" : ""}{p.trend} 30d
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4">
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-600 italic">No available {pos}s</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Waiver Risers */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                    Waiver Risers
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-0.5">Trending up in value · top 5 per position</p>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Rising
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800/40">
                {KEY_POSITIONS.map((pos) => {
                  const risers = risersByPos[pos] ?? [];
                  return (
                    <div key={pos} className="divide-y divide-zinc-200 dark:divide-zinc-800/30">
                      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/30">
                        <span className={`rounded-full border px-2 py-px text-[9px] font-bold ${POS_TEXT[pos]}`}>{pos}</span>
                      </div>
                      {risers.length > 0 ? (
                        risers.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/20 transition-colors">
                            <span className="text-[10px] text-zinc-500 w-4 shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.name}</p>
                              {p.team && <p className="text-[10px] text-zinc-500">{p.team}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{p.value.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">+{p.trend} 30d</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4">
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-600 italic">No rising {pos}s on waivers</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
