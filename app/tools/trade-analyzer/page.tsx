"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiX } from "react-icons/fi";

import type { Settings, ValueMap, SelectedPlayer, League, SleeperRoster, SleeperPick, SleeperUser, PlayerInfo, LeagueTeam } from "./types";
import { BENCH_SPOT_VALUE } from "./constants";
import { pickKey, pickFcId, parseStarterCounts, pickToSelectedPlayer, rosterPlayerToSelectedPlayer } from "./helpers";

import { ToggleGroup }       from "./components/ToggleGroup";
import { LeagueDropdown }    from "./components/LeagueDropdown";
import { TeamPicker }        from "./components/TeamPicker";
import { RosterTradeSide }   from "./components/RosterTradeSide";
import { FreeTradeSide }     from "./components/FreeTradeSide";
import { ResultBanner }      from "./components/ResultBanner";
import { TradeBalancer }     from "./components/TradeBalancer";
import { TeamNeeds }         from "./components/TeamNeeds";
import { AIOverview }        from "./components/AIOverview";

export default function TradeAnalyzerPage() {
  const router = useRouter();
  const [settings, setSettings]       = useState<Settings>({ isDynasty: true, numQbs: 1, ppr: 1 });
  const [valueMap, setValueMap]       = useState<ValueMap>({});
  const [valuesLoading, setValuesLoading] = useState(false);
  const [valuesStale, setValuesStale] = useState(false);

  const [leagues, setLeagues]                   = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague]     = useState<League | null>(null);
  const [mySleeperUserId, setMySleeperUserId]   = useState<string | null>(null);

  // Free-mode state
  const [mySide, setMySide]     = useState<SelectedPlayer[]>([]);
  const [theirSide, setTheirSide] = useState<SelectedPlayer[]>([]);

  // League-mode state
  const [leagueTeams, setLeagueTeams]       = useState<LeagueTeam[]>([]);
  const [infoMap, setInfoMap]               = useState<Record<string, PlayerInfo>>({});
  const [pickOwnership, setPickOwnership]   = useState<Record<number, SleeperPick[]>>({});
  const [starterCounts, setStarterCounts]   = useState<Record<string, number>>({});
  const [leagueLoading, setLeagueLoading]   = useState(false);
  const [opponentRosterId, setOpponentRosterId] = useState<number | null>(null);
  const [mySelectedIds, setMySelectedIds]       = useState<Set<string>>(new Set());
  const [theirSelectedIds, setTheirSelectedIds] = useState<Set<string>>(new Set());

  // Fetch leagues + sleeperUserId once
  useEffect(() => {
    fetch("/api/my-leagues")
      .then((r) => r.json())
      .then((d) => {
        setLeagues(d.leagues ?? []);
        if (d.sleeperUserId) setMySleeperUserId(d.sleeperUserId);
      });
  }, []);

  // Fetch FantasyCalc values on settings change
  useEffect(() => {
    setValuesLoading(true);
    const { isDynasty, numQbs, ppr } = settings;
    fetch(`/api/trade-analyzer/values?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (!body?.map || body.error) throw new Error(body?.error ?? "Bad response");
        const data: ValueMap = body.map;
        setValuesStale(!!body.stale);
        setValueMap(data);
        const rehydrate = (p: SelectedPlayer): SelectedPlayer => {
          const d = data[p.sleeperId];
          return d ? { ...p, value: d.value, trend: d.trend, redraftValue: d.redraftValue, age: d.age, tier: d.tier } : p;
        };
        setMySide((prev) => prev.map(rehydrate));
        setTheirSide((prev) => prev.map(rehydrate));
      })
      .catch((e) => {
        console.error("[values fetch]", e);
        setValuesStale(true);
      })
      .finally(() => setValuesLoading(false));
  }, [settings]);

  // When league changes, fetch rosters + users + picks + league settings
  useEffect(() => {
    setOpponentRosterId(null);
    setMySelectedIds(new Set());
    setTheirSelectedIds(new Set());
    setMySide([]);
    setTheirSide([]);
    setLeagueTeams([]);
    setInfoMap({});
    setPickOwnership({});
    setStarterCounts({});

    const sleeperLeagueId = selectedLeague?.latestSeason?.sleeperLeagueId;
    if (!sleeperLeagueId) return;

    setLeagueLoading(true);
    Promise.all([
      fetch(`/api/sleeper/rosters/${sleeperLeagueId}`).then((r) => r.json()),
      fetch(`/api/sleeper/league/${sleeperLeagueId}/users`).then((r) => r.json()),
      fetch(`/api/sleeper/league/${sleeperLeagueId}/picks`).then((r) => r.json()),
      fetch(`/api/sleeper/league/${sleeperLeagueId}`).then((r) => r.json()),
    ])
      .then(async ([rosters, users, picks, leagueSettings]: [
        SleeperRoster[],
        SleeperUser[],
        Record<string, SleeperPick[]>,
        { roster_positions?: string[] },
      ]) => {
        if (!Array.isArray(rosters) || !Array.isArray(users)) return;

        const userMap = Object.fromEntries(users.map((u) => [u.user_id, u]));
        setLeagueTeams(rosters.map((r) => ({
          roster: r,
          user: r.owner_id ? (userMap[r.owner_id] ?? null) : null,
        })));

        if (Array.isArray(leagueSettings?.roster_positions)) {
          setStarterCounts(parseStarterCounts(leagueSettings.roster_positions));
        }

        if (picks && typeof picks === "object") {
          const numericOwnership: Record<number, SleeperPick[]> = {};
          for (const [k, v] of Object.entries(picks)) numericOwnership[Number(k)] = v;
          setPickOwnership(numericOwnership);
        }

        const allIds = [...new Set(rosters.flatMap((r) => r.players ?? []))];
        if (allIds.length > 0) {
          const chunks: string[][] = [];
          for (let i = 0; i < allIds.length; i += 100) chunks.push(allIds.slice(i, i + 100));
          const results = await Promise.all(
            chunks.map((chunk) =>
              fetch(`/api/sleeper/players/batch?ids=${chunk.join(",")}`).then((r) => r.json())
            )
          );
          const flat: PlayerInfo[] = results.flat();
          setInfoMap(Object.fromEntries(flat.map((p) => [p.id, p])));
        }
      })
      .finally(() => setLeagueLoading(false));
  }, [selectedLeague]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const isLeagueMode  = !!(selectedLeague?.latestSeason?.sleeperLeagueId && leagueTeams.length > 0);
  const myRosterTeam  = leagueTeams.find((t) => t.roster.owner_id === mySleeperUserId);
  const opponentTeam  = leagueTeams.find((t) => t.roster.roster_id === opponentRosterId) ?? null;
  const otherTeams    = leagueTeams.filter((t) => t.roster.owner_id !== mySleeperUserId);

  const calcTotal = (roster: SleeperRoster | null | undefined, selectedIds: Set<string>): number => {
    if (!roster) return 0;
    const playerTotal = (roster.players ?? [])
      .filter((id) => selectedIds.has(id))
      .reduce((s, id) => s + (valueMap[id]?.value ?? 0), 0);
    const ownedPicks = pickOwnership[roster.roster_id] ?? [];
    const pickTotal  = ownedPicks
      .filter((p) => selectedIds.has(pickKey(p)))
      .reduce((s, p) => s + (valueMap[pickFcId(p)]?.value ?? 0), 0);
    return playerTotal + pickTotal;
  };

  const myTotal    = isLeagueMode ? calcTotal(myRosterTeam?.roster, mySelectedIds) : mySide.reduce((s, p) => s + p.value, 0);
  const theirTotal = isLeagueMode ? calcTotal(opponentTeam?.roster, theirSelectedIds) : theirSide.reduce((s, p) => s + p.value, 0);

  const myCount    = isLeagueMode ? mySelectedIds.size : mySide.length;
  const theirCount = isLeagueMode ? theirSelectedIds.size : theirSide.length;
  const myBenchBonus    = Math.max(0, myCount - theirCount) * BENCH_SPOT_VALUE;
  const theirBenchBonus = Math.max(0, theirCount - myCount) * BENCH_SPOT_VALUE;

  const adjustedMy    = myTotal + myBenchBonus;
  const adjustedTheir = theirTotal + theirBenchBonus;
  const tradeDiff = adjustedTheir - adjustedMy;
  const tradeGap  = Math.abs(tradeDiff);
  const tradeBase = Math.max(adjustedMy, adjustedTheir);
  const tradePct  = tradeBase > 0 ? (tradeGap / tradeBase) * 100 : 0;

  const allSelected = [...mySide.map((p) => p.sleeperId), ...theirSide.map((p) => p.sleeperId)];

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleMyPlayer    = (id: string)          => toggleId(setMySelectedIds, id);
  const toggleMyPick      = (pick: SleeperPick)   => toggleId(setMySelectedIds, pickKey(pick));
  const toggleTheirPlayer = (id: string)          => toggleId(setTheirSelectedIds, id);
  const toggleTheirPick   = (pick: SleeperPick)   => toggleId(setTheirSelectedIds, pickKey(pick));

  const handleClear = () => {
    setMySide([]); setTheirSide([]);
    setMySelectedIds(new Set()); setTheirSelectedIds(new Set());
    setOpponentRosterId(null);
  };

  const updateSetting = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const hasSelections = isLeagueMode
    ? mySelectedIds.size > 0 || theirSelectedIds.size > 0
    : mySide.length > 0 || theirSide.length > 0;

  // League-mode: selected assets (players + picks) as SelectedPlayer lists
  const selectedAssets = (team: LeagueTeam | null | undefined, ids: Set<string>): SelectedPlayer[] => {
    if (!team) return [];
    const players = (team.roster.players ?? [])
      .filter((id) => ids.has(id))
      .map((id) => rosterPlayerToSelectedPlayer(id, infoMap, valueMap));
    const picks = (pickOwnership[team.roster.roster_id] ?? [])
      .filter((pk) => ids.has(pickKey(pk)))
      .map((pk) => ({ ...pickToSelectedPlayer(pk, valueMap), sleeperId: pickKey(pk) }));
    return [...players, ...picks];
  };

  const aiSideA = isLeagueMode ? selectedAssets(myRosterTeam, mySelectedIds) : mySide;
  const aiSideB = isLeagueMode ? selectedAssets(opponentTeam, theirSelectedIds) : theirSide;

  // Balance-the-trade suggestions: the side getting the better end adds an asset
  const balanceCandidates = (pool: SelectedPlayer[]): SelectedPlayer[] =>
    pool
      .filter((p) => p.value > 0 && p.value >= tradeGap * 0.4 && p.value <= tradeGap * 1.5)
      .sort((a, b) => Math.abs(a.value - tradeGap) - Math.abs(b.value - tradeGap))
      .slice(0, 3);

  let balancer: { sideLabel: string; candidates: SelectedPlayer[]; onAdd: (p: SelectedPlayer) => void } | null = null;
  if (myTotal > 0 && theirTotal > 0 && tradePct >= 5) {
    const winnerIsMe = tradeDiff > 0; // I receive more value, so my side adds
    if (isLeagueMode) {
      const team   = winnerIsMe ? myRosterTeam : opponentTeam;
      const selIds = winnerIsMe ? mySelectedIds : theirSelectedIds;
      if (team) {
        const pool = [
          ...(team.roster.players ?? [])
            .filter((id) => !selIds.has(id))
            .map((id) => rosterPlayerToSelectedPlayer(id, infoMap, valueMap)),
          ...(pickOwnership[team.roster.roster_id] ?? [])
            .filter((pk) => !selIds.has(pickKey(pk)))
            .map((pk) => ({ ...pickToSelectedPlayer(pk, valueMap), sleeperId: pickKey(pk) })),
        ];
        balancer = {
          sideLabel: winnerIsMe ? "your side" : "their side",
          candidates: balanceCandidates(pool),
          onAdd: (p) => toggleId(winnerIsMe ? setMySelectedIds : setTheirSelectedIds, p.sleeperId),
        };
      }
    } else {
      const pool = Object.entries(valueMap)
        .filter(([id]) => !allSelected.includes(id))
        .map(([id, v]) => ({
          sleeperId: id, name: v.name, position: v.position, team: v.team,
          value: v.value, trend: v.trend, redraftValue: v.redraftValue, age: v.age, tier: v.tier,
        }));
      balancer = {
        sideLabel: winnerIsMe ? "your side" : "their side",
        candidates: balanceCandidates(pool),
        onAdd: winnerIsMe
          ? (p) => setMySide((prev) => [...prev, p])
          : (p) => setTheirSide((prev) => [...prev, p]),
      };
    }
  }

  const clearButton = hasSelections && (
    <button
      onClick={handleClear}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
    >
      <FiX className="h-3 w-3" />
      Clear
    </button>
  );

  const vsDivider = (
    <div className="flex md:flex-col items-center justify-center gap-2 md:pt-8 shrink-0">
      <div className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60 flex items-center justify-center text-zinc-500 text-xs font-bold">
        VS
      </div>
      {clearButton}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-5xl px-4 pb-28 md:pb-24 pt-6 md:pt-10">

        {/* Header */}
        <div className="mb-6 md:mb-8">
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Trade Analyzer</h1>
          <p className="mt-1 text-sm text-zinc-500">Compare player values and evaluate any trade.</p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-600">
            Dynasty values powered by{" "}
            <a href="https://fantasycalc.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors">
              FantasyCalc
            </a>
          </p>
        </div>

        {/* Settings + League row */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            <ToggleGroup
              label="Format"
              options={[{ label: "Dynasty", value: true }, { label: "Redraft", value: false }]}
              value={settings.isDynasty}
              onChange={(v) => updateSetting("isDynasty", v)}
            />
            <ToggleGroup
              label="QB Settings"
              options={[{ label: "1QB", value: 1 }, { label: "Superflex", value: 2 }]}
              value={settings.numQbs}
              onChange={(v) => updateSetting("numQbs", v as 1 | 2)}
            />
            <ToggleGroup
              label="Scoring"
              options={[{ label: "Full PPR", value: 1 }, { label: "Half PPR", value: 0.5 }, { label: "Standard", value: 0 }]}
              value={settings.ppr}
              onChange={(v) => updateSetting("ppr", v as 0 | 0.5 | 1)}
            />
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">League</span>
              <LeagueDropdown leagues={leagues} selected={selectedLeague} onSelect={setSelectedLeague} />
            </div>
            {isLeagueMode && (
              <div className="flex flex-col gap-1.5 w-full sm:w-auto sm:min-w-[200px]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Opponent</span>
                <TeamPicker
                  teams={otherTeams}
                  selectedRosterId={opponentRosterId}
                  onSelect={(id) => { setOpponentRosterId(id); setTheirSelectedIds(new Set()); }}
                />
              </div>
            )}
          </div>
          {(valuesLoading || leagueLoading) && (
            <p className="mt-3 text-[11px] text-zinc-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-700 border-t-amber-400 animate-spin inline-block" />
              {leagueLoading ? "Loading rosters…" : "Loading player values…"}
            </p>
          )}
          {!valuesLoading && valuesStale && (
            <p className="mt-3 text-[11px] text-amber-500/80 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Values may be from a previous session — FantasyCalc was unreachable, showing cached data.
            </p>
          )}
        </div>

        {/* Result banner */}
        <div className="mb-4">
          <ResultBanner
            myTotal={myTotal} theirTotal={theirTotal}
            myBenchBonus={myBenchBonus} theirBenchBonus={theirBenchBonus}
          />
        </div>

        {/* Balance suggestions */}
        {balancer && balancer.candidates.length > 0 && (
          <div className="mb-4">
            <TradeBalancer
              gap={tradeGap}
              sideLabel={balancer.sideLabel}
              candidates={balancer.candidates}
              onAdd={balancer.onAdd}
            />
          </div>
        )}

        {/* AI Overview */}
        <div className="mb-4">
          <AIOverview sideA={aiSideA} sideB={aiSideB} isDynasty={settings.isDynasty} numQbs={settings.numQbs} ppr={settings.ppr} />
        </div>

        {/* Trade sides */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-start">
          {isLeagueMode ? (
            <>
              <RosterTradeSide
                label="My Team"
                roster={myRosterTeam?.roster ?? null}
                picks={myRosterTeam ? (pickOwnership[myRosterTeam.roster.roster_id] ?? []) : []}
                infoMap={infoMap}
                valueMap={valueMap}
                selectedIds={mySelectedIds}
                onTogglePlayer={toggleMyPlayer}
                onTogglePick={toggleMyPick}
                accent="amber"
                emptyMessage="Loading your roster…"
              />
              {vsDivider}
              <RosterTradeSide
                label="Their Team"
                roster={opponentTeam?.roster ?? null}
                picks={opponentTeam ? (pickOwnership[opponentTeam.roster.roster_id] ?? []) : []}
                infoMap={infoMap}
                valueMap={valueMap}
                selectedIds={theirSelectedIds}
                onTogglePlayer={toggleTheirPlayer}
                onTogglePick={toggleTheirPick}
                accent="blue"
                emptyMessage="Select an opponent above"
              />
            </>
          ) : (
            <>
              <FreeTradeSide
                label="My Team"
                players={mySide}
                rawTotal={mySide.reduce((s, p) => s + p.value, 0)}
                benchBonus={myBenchBonus}
                isDynasty={settings.isDynasty}
                valueMap={valueMap}
                excluded={allSelected}
                onAdd={(p) => setMySide((prev) => [...prev, p])}
                onRemove={(id) => setMySide((prev) => prev.filter((p) => p.sleeperId !== id))}
                accent="amber"
              />
              {vsDivider}
              <FreeTradeSide
                label="Their Team"
                players={theirSide}
                rawTotal={theirSide.reduce((s, p) => s + p.value, 0)}
                benchBonus={theirBenchBonus}
                isDynasty={settings.isDynasty}
                valueMap={valueMap}
                excluded={allSelected}
                onAdd={(p) => setTheirSide((prev) => [...prev, p])}
                onRemove={(id) => setTheirSide((prev) => prev.filter((p) => p.sleeperId !== id))}
                accent="blue"
              />
            </>
          )}
        </div>

        {/* Team Needs — league mode only */}
        {isLeagueMode && (myRosterTeam || opponentTeam) && (
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-stretch md:items-start">
            <TeamNeeds
              label="My Team"
              roster={myRosterTeam?.roster ?? null}
              infoMap={infoMap}
              valueMap={valueMap}
              starterCounts={starterCounts}
              accent="amber"
            />
            <div className="hidden md:block w-12 shrink-0" />
            <TeamNeeds
              label="Their Team"
              roster={opponentTeam?.roster ?? null}
              infoMap={infoMap}
              valueMap={valueMap}
              starterCounts={starterCounts}
              accent="blue"
            />
          </div>
        )}

      </div>

      {/* Sticky mobile summary bar */}
      {hasSelections && (myTotal > 0 || theirTotal > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">You give</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{adjustedMy.toLocaleString()}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
              myTotal === 0 || theirTotal === 0
                ? "text-zinc-500 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40"
                : tradePct < 5
                  ? "text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40"
                  : tradeDiff > 0
                    ? "text-emerald-500 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : "text-red-500 dark:text-red-400 border-red-500/30 bg-red-500/10"
            }`}>
              {myTotal === 0 || theirTotal === 0 ? "…" : tradePct < 5 ? "Even" : tradeDiff > 0 ? `+${tradeGap.toLocaleString()}` : `−${tradeGap.toLocaleString()}`}
            </span>
            <div className="min-w-0 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">You get</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{adjustedTheir.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
