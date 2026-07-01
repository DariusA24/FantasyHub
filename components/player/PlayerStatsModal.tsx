import React, { useEffect, useState } from "react";
import type { SleeperPlayer } from "@/app/hub-league/[hubLeagueId]/roster/page";
import { getSleeperPlayersProfilePicture } from "@/utils/sleeperActions";
import { MaddenStatsContainer } from "../ui/MaddenStats";
import { DynastyRankingContainer } from "../ui/DynastyRanking";
import { PlayerDiscussion } from "./PlayerDiscussion";

// ─── Position stat configs ─────────────────────────────────────────────────────

type StatDef = { key: string; label: string; format?: (v: number, s: Record<string, number>) => string };

function pct(num: string, den: string) {
  return (_v: number, s: Record<string, number>) => {
    const d = s[den];
    return d ? `${((s[num] / d) * 100).toFixed(1)}%` : "—";
  };
}

function ypr(_v: number, s: Record<string, number>) {
  const r = s["rec"];
  return r ? (s["rec_yd"] / r).toFixed(1) : "—";
}

const POS_STATS: Record<string, StatDef[]> = {
  QB: [
    { key: "pass_yd",  label: "Pass Yds" },
    { key: "pass_td",  label: "Pass TDs" },
    { key: "pass_int", label: "INTs" },
    { key: "cmp_pct",  label: "Comp %", format: pct("pass_cmp", "pass_att") },
    { key: "rush_yd",  label: "Rush Yds" },
    { key: "rush_td",  label: "Rush TDs" },
  ],
  RB: [
    { key: "rush_yd",  label: "Rush Yds" },
    { key: "rush_att", label: "Carries" },
    { key: "rush_td",  label: "Rush TDs" },
    { key: "rec",      label: "Rec" },
    { key: "rec_yd",   label: "Rec Yds" },
    { key: "rec_td",   label: "Rec TDs" },
  ],
  WR: [
    { key: "rec",     label: "Rec" },
    { key: "rec_tgt", label: "Targets" },
    { key: "rec_yd",  label: "Rec Yds" },
    { key: "rec_td",  label: "Rec TDs" },
    { key: "ypr",     label: "Yds / Rec", format: ypr },
    { key: "rush_yd", label: "Rush Yds" },
  ],
  TE: [
    { key: "rec",     label: "Rec" },
    { key: "rec_tgt", label: "Targets" },
    { key: "rec_yd",  label: "Rec Yds" },
    { key: "rec_td",  label: "Rec TDs" },
    { key: "ypr",     label: "Yds / Rec", format: ypr },
  ],
  K: [
    { key: "fgm",    label: "FG Made" },
    { key: "fga",    label: "FG Att" },
    { key: "xpm",    label: "XP Made" },
    { key: "fg_lng", label: "Long FG" },
  ],
  DEF: [
    { key: "sack",    label: "Sacks" },
    { key: "int",     label: "INTs" },
    { key: "fum_rec", label: "Fum Rec" },
    { key: "def_td",  label: "TDs" },
  ],
};

function fmtStat(def: StatDef, stats: Record<string, number>): string {
  if (def.format) return def.format(stats[def.key] ?? 0, stats);
  const v = stats[def.key];
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function HeroCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
  );
}

function StatGrid({ position, stats, loading }: { position: string; stats: Record<string, number>; loading: boolean }) {
  const defs = POS_STATS[position] ?? [];
  if (defs.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mb-2">
        Season Stats
      </p>
      <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800/60 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60">
        {defs.map((def) => (
          <div key={def.key} className="bg-white dark:bg-zinc-900/80 px-3 py-2.5">
            {loading ? (
              <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1" />
            ) : (
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {fmtStat(def, stats)}
              </p>
            )}
            <p className="text-[10px] text-zinc-500 mt-0.5">{def.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LastWeekBar({ actual, proj, rec }: { actual: number | null | undefined; proj: number | null | undefined; rec: number }) {
  if (actual == null && proj == null) return null;
  const ptsKey = rec >= 1 ? "PPR" : rec >= 0.5 ? "Half PPR" : "Std";
  const diff = actual != null && proj != null ? actual - proj : null;
  const beat = diff != null && diff > 0;
  const missed = diff != null && diff < 0;

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mb-2">
        Last Week · {ptsKey}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-zinc-500 mb-0.5">Actual</p>
          <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
            {actual != null ? actual.toFixed(1) : "—"}
          </p>
        </div>
        <div className="text-zinc-300 dark:text-zinc-700 text-lg font-light">vs</div>
        <div className="flex-1">
          <p className="text-[10px] text-zinc-500 mb-0.5">Projected</p>
          <p className="text-xl font-black text-zinc-500 dark:text-zinc-400 tabular-nums">
            {proj != null ? proj.toFixed(1) : "—"}
          </p>
        </div>
        {diff != null && (
          <div className={`flex-1 text-right`}>
            <p className="text-[10px] text-zinc-500 mb-0.5">vs Proj</p>
            <p className={`text-base font-bold tabular-nums ${beat ? "text-emerald-600 dark:text-emerald-400" : missed ? "text-red-500 dark:text-red-400" : "text-zinc-500"}`}>
              {beat ? "+" : ""}{diff.toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function PlayerStatsModal({
  open,
  player,
  onClose,
  isSuperFlex = false,
  projPts,
  lastWkPts,
  rec = 1,
}: {
  open: boolean;
  player: SleeperPlayer | null;
  onClose: () => void;
  isSuperFlex?: boolean;
  projPts?: number | null;
  lastWkPts?: number | null;
  rec?: number;
}) {
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [maddenOpen, setMaddenOpen]   = useState(false);

  const [allStats, setAllStats]         = useState<Record<number, Record<string, number>>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch avatar
  useEffect(() => {
    if (!open || !player?.player_id) { setAvatarUrl(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoadingAvatar(true);
        const url = await getSleeperPlayersProfilePicture(player.player_id);
        if (!cancelled) setAvatarUrl(url);
      } catch { if (!cancelled) setAvatarUrl(null); }
      finally  { if (!cancelled) setLoadingAvatar(false); }
    })();
    return () => { cancelled = true; };
  }, [open, player?.player_id]);

  // Fetch full career stats: get years_exp first, then fetch all seasons in parallel
  useEffect(() => {
    if (!open || !player?.player_id) { setAllStats({}); return; }
    let cancelled = false;
    setStatsLoading(true);

    (async () => {
      try {
        const playerRes = await fetch(`/api/sleeper/players/${player.player_id}`);
        const playerData = playerRes.ok ? await playerRes.json() : null;
        const yearsExp: number | null = playerData?.rawJson?.years_exp ?? null;
        const classYear = yearsExp !== null ? 2026 - yearsExp : 2022;
        const earliest = Math.max(classYear, 2015); // Sleeper data reliable from 2015

        const years: number[] = [];
        for (let y = earliest; y <= 2025; y++) years.push(y);

        const results = await Promise.all(
          years.map((yr) =>
            fetch(`/api/players/${player.player_id}/season-stats?season=${yr}`)
              .then((r) => r.json())
              .then((d) => ({ yr, data: (d ?? {}) as Record<string, number> }))
              .catch(() => ({ yr, data: {} as Record<string, number> }))
          )
        );

        if (cancelled) return;
        const map: Record<number, Record<string, number>> = {};
        for (const { yr, data } of results) map[yr] = data;
        setAllStats(map);
      } catch { /* show dashes */ }
      finally { if (!cancelled) setStatsLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [open, player?.player_id]);

  if (!open || !player) return null;

  const ptsKey = rec >= 1 ? "pts_ppr" : rec >= 0.5 ? "pts_half_ppr" : "pts_std";
  // Most recent season with data for the hero row
  const statYears = [2025, 2024, 2023, 2022].filter((y) => {
    const s = allStats[y] ?? {};
    return (s.gp ?? 0) > 0 || Object.values(s).some((v) => v > 0);
  });
  const latestStats = allStats[statYears[0]] ?? {};
  const gp       = latestStats.gp ?? 0;
  const totalPts = latestStats[ptsKey] ?? latestStats.pts_ppr ?? 0;
  const avgPts   = gp > 0 ? totalPts / gp : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#050609] border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl flex flex-col max-h-[90vh]">
        <div className="overflow-y-auto flex-1 p-5 space-y-1">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {loadingAvatar ? (
                  <div className="h-full w-full rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={player.full_name ?? player.player_id} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">No photo</span>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                  {player.full_name ?? player.player_id}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {player.position && (
                    <span className="mr-2 font-semibold text-zinc-700 dark:text-zinc-200">{player.position}</span>
                  )}
                  {player.team && <span>{player.team}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              Close
            </button>
          </div>

          {/* ── Fantasy snapshot row ── */}
          <div className="flex items-center divide-x divide-zinc-200 dark:divide-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-3">
            <HeroCell
              label="Proj Pts"
              value={projPts != null ? projPts.toFixed(1) : "—"}
            />
            <HeroCell
              label="Avg / Game"
              value={statsLoading ? "…" : avgPts != null ? avgPts.toFixed(1) : "—"}
            />
            <HeroCell
              label="Games"
              value={statsLoading ? "…" : gp > 0 ? String(gp) : "—"}
            />
          </div>

          {/* ── Career stats table ── */}
          {(POS_STATS[player.position ?? ""] ?? []).length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mb-2">
                Career Stats
              </p>
              {statsLoading ? (
                <div className="space-y-2">
                  {[0,1,2].map((i) => (
                    <div key={i} className="h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800/60">
                  <table className="w-full text-left min-w-max">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/60">
                        <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600 sticky left-0 bg-zinc-50 dark:bg-zinc-900/60">
                          Season
                        </th>
                        <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600 text-right">G</th>
                        <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600 text-right whitespace-nowrap">
                          {rec >= 1 ? "PPR" : rec >= 0.5 ? "½PPR" : "Std"}/G
                        </th>
                        {(POS_STATS[player.position ?? ""] ?? []).map((def, i) => (
                          <th key={`${def.key}-${i}`} className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-600 text-right whitespace-nowrap">
                            {def.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(allStats).map(Number).sort((a, b) => b - a).map((yr) => {
                        const s = allStats[yr] ?? {};
                        const gpYr = s.gp ?? 0;
                        const pts = s[ptsKey] ?? s.pts_ppr ?? 0;
                        const avg = gpYr > 0 ? pts / gpYr : null;
                        const hasData = gpYr > 0 || Object.values(s).some((v) => v > 0);
                        const isLatest = yr === statYears[0];
                        return (
                          <tr
                            key={yr}
                            className={`border-b border-zinc-100 dark:border-zinc-800/30 last:border-0 ${
                              isLatest ? "bg-amber-50/50 dark:bg-amber-500/[0.04]" : ""
                            }`}
                          >
                            <td className={`px-3 py-2.5 sticky left-0 ${isLatest ? "bg-amber-50/50 dark:bg-amber-500/[0.04]" : "bg-white dark:bg-[#050609]"}`}>
                              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{yr}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`text-[11px] font-semibold tabular-nums ${hasData ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-300 dark:text-zinc-700"}`}>
                                {hasData ? gpYr : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`text-[11px] font-semibold tabular-nums ${avg !== null ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-300 dark:text-zinc-700"}`}>
                                {avg !== null ? avg.toFixed(1) : "—"}
                              </span>
                            </td>
                            {(POS_STATS[player.position ?? ""] ?? []).map((def, i) => {
                              const display = fmtStat(def, s);
                              return (
                                <td key={`${def.key}-${i}`} className="px-3 py-2.5 text-right">
                                  <span className={`text-[11px] font-semibold tabular-nums ${display === "—" ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-800 dark:text-zinc-200"}`}>
                                    {display}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Last week ── */}
          <LastWeekBar actual={lastWkPts} proj={projPts} rec={rec} />

          {/* ── Dynasty Ranking ── */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mb-2">
              Dynasty Ranking
            </p>
            <DynastyRankingContainer
              sleeperPlayerId={player.player_id}
              playerName={player.full_name ?? null}
              isSuperFlex={isSuperFlex}
            />
          </div>

          {/* ── Madden Ratings ── */}
          <button
            onClick={() => setMaddenOpen((o) => !o)}
            className="w-full flex items-center justify-between mt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <span>Madden Ratings</span>
            <span>{maddenOpen ? "▲" : "▼"}</span>
          </button>
          {maddenOpen && (
            <div className="mt-2">
              <MaddenStatsContainer sleeperPlayerId={player.player_id} />
            </div>
          )}

          {/* ── Discussion ── */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mb-2">
              Discussion
            </p>
            <PlayerDiscussion playerId={player.player_id} height={300} />
          </div>

        </div>
      </div>
    </div>
  );
}
