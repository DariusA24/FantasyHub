"use client";

import React from "react";
import type { ComparePlayer, PlayerProps } from "./CompareCard";

// ── Styling ────────────────────────────────────────────────────────────────────

const POS_STYLE: Record<string, string> = {
  QB:  "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",
  RB:  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  WR:  "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  TE:  "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30",
  K:   "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
  DEF: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700",
};

// ── Signal helpers ─────────────────────────────────────────────────────────────

type Signal = "green" | "yellow" | "red";

const DOT: Record<Signal, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-400",
  red:    "bg-red-500",
};
const PILL: Record<Signal, string> = {
  green:  "text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 border border-emerald-500/25",
  yellow: "text-amber-700  dark:text-amber-300  bg-amber-400/12  border border-amber-400/25",
  red:    "text-red-700    dark:text-red-300    bg-red-500/12    border border-red-500/25",
};

function projSignal(pts: number, pos: string): Signal {
  const t: Record<string, [number, number]> = { QB: [22, 14], RB: [14, 8], WR: [14, 8], TE: [10, 6], K: [7, 4] };
  const [good, bad] = t[pos] ?? [12, 6];
  return pts >= good ? "green" : pts >= bad ? "yellow" : "red";
}
function ydsSignal(yds: number, pos: string): Signal {
  const t: Record<string, [number, number]> = { QB: [250, 160], RB: [65, 35], WR: [65, 35], TE: [40, 20] };
  const [good, bad] = t[pos] ?? [60, 30];
  return yds >= good ? "green" : yds >= bad ? "yellow" : "red";
}
function dvpSignal(pts: number, pos: string): Signal {
  const t: Record<string, [number, number]> = { QB: [22, 14], WR: [42, 30], RB: [28, 18], TE: [14, 7] };
  const [easy, tough] = t[pos] ?? [30, 20];
  return pts >= easy ? "green" : pts >= tough ? "yellow" : "red";
}
function totalSignal(total: number): Signal {
  return total >= 47 ? "green" : total >= 44 ? "yellow" : "red";
}
function spreadSignal(spread: number, pos: string): Signal {
  if (pos === "RB") {
    if (spread <= -5) return "green";
    if (spread <= 3)  return "yellow";
    return "red";
  }
  const abs = Math.abs(spread);
  return abs <= 4 ? "green" : abs <= 9 ? "yellow" : "red";
}
function injurySignal(status: string | null | undefined): Signal {
  if (!status) return "green";
  const s = status.toLowerCase();
  if (s === "active" || s === "") return "green";
  if (s === "questionable") return "yellow";
  return "red";
}

function injuryLabel(status: string | null | undefined): string {
  if (!status) return "Active";
  const map: Record<string, string> = {
    questionable: "Questionable", doubtful: "Doubtful", out: "Out",
    "injured reserve": "IR", ir: "IR", active: "Active",
  };
  return map[status.toLowerCase()] ?? status;
}
function spreadLabel(spread: number | null, isFav: boolean): string {
  if (spread === null) return "—";
  const abs = Math.abs(spread);
  return isFav ? `-${abs.toFixed(1)}` : `+${abs.toFixed(1)}`;
}
function ydsLabel(pos: string): string {
  if (pos === "QB") return "Pass Yds/G";
  if (pos === "RB") return "Rush Yds/G";
  return "Rec Yds/G";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Pill({ signal, children }: { signal?: Signal; children: React.ReactNode }) {
  if (!signal) return (
    <span className="text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-600">—</span>
  );
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${PILL[signal]}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[signal]}`} />
      {children}
    </span>
  );
}

function Skeleton() {
  return <div className="mx-auto h-5 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
}

function SectionDivider({ label, badge }: { label: string; badge?: string }) {
  return (
    <tr>
      <td colSpan={99} className="pt-5 pb-2 px-5">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
            {label}
          </span>
          {badge && (
            <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-px text-[8px] font-semibold text-zinc-400 dark:text-zinc-500">
              {badge}
            </span>
          )}
          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      </td>
    </tr>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/20 transition-colors">
      <td className="pl-5 pr-4 py-2.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap w-36 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
        {label}
      </td>
      {children}
    </tr>
  );
}

function ValueCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2.5 text-center">
      <div className="flex justify-center items-center min-h-[24px]">{children}</div>
    </td>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function FactorsList({ players }: { players: ComparePlayer[] }) {
  if (players.length < 2) return null;

  const isLoading = (v: unknown) => v === undefined;

  function propsYdsContent(p: ComparePlayer) {
    if (isLoading(p.props) && !!p.opponent) return <Skeleton />;
    if (p.props?.ydsLine != null) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-extrabold tabular-nums text-zinc-800 dark:text-zinc-200">
            {p.props.ydsLine} yds
          </span>
          <span className="text-[9px] tabular-nums text-zinc-400 dark:text-zinc-500">
            O {p.props.ydsOver} · U {p.props.ydsUnder}
          </span>
        </div>
      );
    }
    return <span className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">Not posted</span>;
  }

  function propsTdContent(p: ComparePlayer) {
    if (isLoading(p.props) && !!p.opponent) return <Skeleton />;
    if (p.props?.anytimeTd != null) {
      const price = parseInt(p.props.anytimeTd);
      const sig: Signal = price <= -150 ? "green" : price <= 0 ? "yellow" : "red";
      return <Pill signal={sig}>{p.props.anytimeTd}</Pill>;
    }
    return <span className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">Not posted</span>;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">

      {/* Card header */}
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          Decision Factors
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${Math.max(440, players.length * 130 + 160)}px` }}>

          {/* Column headers */}
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/40">
              <th className="pl-5 pr-4 py-3 text-left w-36" />
              {players.map((p) => (
                <th key={p.sleeperId} className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`rounded-full border px-1.5 py-px text-[8px] font-bold ${POS_STYLE[p.position] ?? POS_STYLE["DEF"]}`}>
                      {p.position}
                    </span>
                    <span className="text-[12px] font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100 truncate max-w-[100px]">
                      {p.name.split(" ").slice(-1)[0]}
                    </span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                      {p.team}{p.opponent ? ` · ${p.opponent}` : ""}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Performance ── */}
            <SectionDivider label="Performance" />

            <DataRow label="Proj pts (wk)">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {p.projectedPts > 0
                    ? <Pill signal={projSignal(p.projectedPts, p.position)}>{p.projectedPts.toFixed(1)}</Pill>
                    : <span className="text-[10px] text-zinc-400 italic">No proj.</span>}
                </ValueCell>
              ))}
            </DataRow>

            <DataRow label="Avg pts/G">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {isLoading(p.avgPtsPerGame)
                    ? <Skeleton />
                    : p.avgPtsPerGame != null
                    ? <Pill signal={projSignal(p.avgPtsPerGame, p.position)}>{p.avgPtsPerGame.toFixed(1)}</Pill>
                    : <span className="text-[10px] text-zinc-400 italic">—</span>}
                </ValueCell>
              ))}
            </DataRow>

            <DataRow label="Yds/G">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {isLoading(p.ydsPerGame)
                    ? <Skeleton />
                    : p.ydsPerGame != null
                    ? <Pill signal={ydsSignal(p.ydsPerGame, p.position)}>{p.ydsPerGame.toFixed(0)}</Pill>
                    : <span className="text-[10px] text-zinc-400 italic">—</span>}
                </ValueCell>
              ))}
            </DataRow>

            <DataRow label="Opp def vs pos">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {isLoading(p.defVsPos) && !!p.opponent
                    ? <Skeleton />
                    : p.defVsPos != null
                    ? <Pill signal={dvpSignal(p.defVsPos, p.position)}>{p.defVsPos.toFixed(1)} pts</Pill>
                    : <span className="text-[10px] text-zinc-400 italic">{p.opponent ? "—" : "No game"}</span>}
                </ValueCell>
              ))}
            </DataRow>

            {/* ── Vegas Game Lines ── */}
            <SectionDivider label="Vegas Game Lines" badge="DraftKings" />

            <DataRow label="Game total">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {isLoading(p.gameOdds) && !!p.opponent
                    ? <Skeleton />
                    : p.gameOdds?.total != null
                    ? <Pill signal={totalSignal(p.gameOdds.total)}>O/U {p.gameOdds.total}</Pill>
                    : <span className="text-[10px] text-zinc-400 italic">{p.opponent ? "—" : "Off-season"}</span>}
                </ValueCell>
              ))}
            </DataRow>

            <DataRow label="Spread">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  {isLoading(p.gameOdds) && !!p.opponent
                    ? <Skeleton />
                    : p.gameOdds?.spread != null
                    ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Pill signal={spreadSignal(p.gameOdds.spread, p.position)}>
                          {spreadLabel(p.gameOdds.spread, p.gameOdds.isFavorite)}
                        </Pill>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-600">
                          {p.gameOdds.isFavorite ? "Favorite" : "Underdog"}
                        </span>
                      </div>
                    )
                    : <span className="text-[10px] text-zinc-400 italic">—</span>}
                </ValueCell>
              ))}
            </DataRow>

            {/* ── Player Props ── */}
            <SectionDivider label="Player Props" badge="DraftKings" />

            <DataRow label={ydsLabel(players[0]?.position ?? "WR")}>
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>{propsYdsContent(p)}</ValueCell>
              ))}
            </DataRow>

            <DataRow label="Anytime TD">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>{propsTdContent(p)}</ValueCell>
              ))}
            </DataRow>

            {/* ── Health ── */}
            <SectionDivider label="Health" />

            <DataRow label="Status">
              {players.map((p) => (
                <ValueCell key={p.sleeperId}>
                  <Pill signal={injurySignal(p.injuryStatus)}>
                    {injuryLabel(p.injuryStatus)}
                  </Pill>
                </ValueCell>
              ))}
            </DataRow>

          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-zinc-100 dark:border-zinc-800/50">
        <p className="text-[9px] text-zinc-400 dark:text-zinc-600">
          Yards/G · Pts/G from 2025 season · Odds via DraftKings · Props posted ~1 week before game
        </p>
      </div>
    </div>
  );
}
