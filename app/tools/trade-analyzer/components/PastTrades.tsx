"use client";

import { useEffect, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { ValueMap } from "../types";
import { POSITION_COLOR, ROUND_NAMES } from "../constants";
import { waiverAdjustment } from "../helpers";

type PastTradePlayer = { sleeperId: string; name: string; position: string | null };
type PastTradePick = {
  season: string;
  round: number;
  originalRosterId: number;
  became: {
    sleeperId: string;
    name: string;
    position: string | null;
    pickLabel: string;
    draftedBy: string | null;
  } | null;
  laterTraded: boolean;
};
type PastTradeTeam = {
  rosterId: number;
  ownerId: string | null;
  teamName: string;
  players: PastTradePlayer[];
  picks: PastTradePick[];
  faab: number;
};
type PastTrade = {
  id: string;
  season: string;
  week: number;
  created: number;
  teams: PastTradeTeam[];
};

const INITIAL_SHOWN = 5;

const pickLabel = (p: PastTradePick) =>
  `${p.season} ${ROUND_NAMES[p.round - 1] ?? `Rd ${p.round}`}`;

export function PastTrades({ sleeperLeagueId, valueMap, mySleeperUserId, isDynasty }: {
  sleeperLeagueId: string;
  valueMap: ValueMap;
  mySleeperUserId: string | null;
  isDynasty: boolean;
}) {
  const [trades, setTrades] = useState<PastTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setTrades([]);
    setError(false);
    setShowAll(false);
    setLoading(true);
    let cancelled = false;
    fetch(`/api/trade-analyzer/past-trades?leagueId=${sleeperLeagueId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (cancelled) return;
        if (!Array.isArray(body?.trades)) throw new Error(body?.error ?? "Bad response");
        setTrades(body.trades);
      })
      .catch((e) => {
        console.error("[past-trades fetch]", e);
        if (!cancelled) setError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [sleeperLeagueId]);

  const playerValue = (id: string) => valueMap[id]?.value ?? null;
  // A pick whose draft already happened is scored as the player actually selected with it;
  // an unresolved (future) pick falls back to its market value.
  const pickValue = (p: PastTradePick) =>
    p.became
      ? (valueMap[p.became.sleeperId]?.value ?? 0)
      : (valueMap[`FP_${p.season}_${p.round}`]?.value ?? null);

  const teamTotal = (team: PastTradeTeam) =>
    team.players.reduce((s, p) => s + (playerValue(p.sleeperId) ?? 0), 0) +
    team.picks.reduce((s, p) => s + (pickValue(p) ?? 0), 0);

  const visible = useMemo(() => {
    const filtered = mineOnly && mySleeperUserId
      ? trades.filter((t) => t.teams.some((team) => team.ownerId === mySleeperUserId))
      : trades;
    return { filtered, shown: showAll ? filtered : filtered.slice(0, INITIAL_SHOWN) };
  }, [trades, mineOnly, mySleeperUserId, showAll]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_6px_rgba(244,208,111,0.6)]" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">Past Trades</h3>
          {trades.length > 0 && (
            <span className="rounded-full border border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40 px-2 py-px text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              {visible.filtered.length}
            </span>
          )}
        </div>
        {mySleeperUserId && trades.length > 0 && (
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60 p-0.5">
            {([false, true] as const).map((mine) => (
              <button
                key={String(mine)}
                onClick={() => { setMineOnly(mine); setShowAll(false); }}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                  mineOnly === mine
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {mine ? "My trades" : "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        {loading && (
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 px-1">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-700 border-t-amber-400 animate-spin inline-block" />
            Loading league trade history…
          </p>
        )}
        {!loading && error && (
          <p className="text-[11px] text-red-400/80 px-1">Couldn’t load trade history from Sleeper. Try again later.</p>
        )}
        {!loading && !error && visible.filtered.length === 0 && (
          <p className="text-[11px] text-zinc-500 px-1">
            {mineOnly ? "You haven’t made any trades in the last two seasons." : "No completed trades found in the last two seasons."}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {visible.shown.map((trade) => {
            const rawTotals = trade.teams.map(teamTotal);
            const assetValues = trade.teams.map((team) => [
              ...team.players.map((p) => playerValue(p.sleeperId) ?? 0),
              ...team.picks.map((p) => pickValue(p) ?? 0),
            ]);
            // Same waiver adjustment as the calculator; it's defined for two-sided trades only
            const waiverAdjs = trade.teams.length === 2
              ? [
                  waiverAdjustment(assetValues[0], assetValues[1], isDynasty),
                  waiverAdjustment(assetValues[1], assetValues[0], isDynasty),
                ]
              : trade.teams.map(() => 0);
            const totals = rawTotals.map((t, i) => t + waiverAdjs[i]);
            const maxTotal = Math.max(...totals);
            const sorted = [...totals].sort((a, b) => b - a);
            const gap = sorted[0] - (sorted[1] ?? 0);
            const pct = maxTotal > 0 ? (gap / maxTotal) * 100 : 0;
            const isEven = pct < 5 || maxTotal === 0;
            const winnerIdx = totals.indexOf(maxTotal);
            const involvesMe = !!mySleeperUserId && trade.teams.some((t) => t.ownerId === mySleeperUserId);
            const date = new Date(trade.created).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

            return (
              <div key={trade.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap">{date}</span>
                    <span className="rounded-full border border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40 px-1.5 py-px text-[9px] font-semibold text-zinc-500">
                      {trade.season} · Wk {trade.week}
                    </span>
                    {involvesMe && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        Your trade
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                    isEven
                      ? "text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40"
                      : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  }`}>
                    {isEven ? "Even so far" : `${trade.teams[winnerIdx].teamName} +${Math.round(gap).toLocaleString()} (${Math.round(pct)}%)`}
                  </span>
                </div>

                <div className={`grid gap-px bg-zinc-200 dark:bg-zinc-800/50 ${trade.teams.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  {trade.teams.map((team, i) => {
                    const isWinner = !isEven && i === winnerIdx;
                    return (
                      <div key={team.rosterId} className="bg-zinc-50 dark:bg-zinc-900/30 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[11px] font-bold truncate ${
                            team.ownerId === mySleeperUserId ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                          }`}>
                            {team.teamName}
                          </span>
                          <span className={`text-[11px] font-bold whitespace-nowrap ${
                            isWinner ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-500"
                          }`}>
                            {Math.round(totals[i]).toLocaleString()}
                          </span>
                        </div>
                        {waiverAdjs[i] > 0 && (
                          <p className="-mt-1 mb-1.5 text-right text-[9px] text-emerald-600/80 dark:text-emerald-500/80">
                            incl. +{waiverAdjs[i].toLocaleString()} waiver adj
                          </p>
                        )}
                        <div className="flex flex-col gap-1">
                          {team.players.map((p) => {
                            const val = playerValue(p.sleeperId);
                            const posClass = POSITION_COLOR[p.position ?? ""] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
                            return (
                              <div key={p.sleeperId} className="flex items-center gap-1.5 text-[11px]">
                                <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8px] font-semibold ${posClass}`}>
                                  {p.position ?? "?"}
                                </span>
                                <span className="truncate text-zinc-700 dark:text-zinc-300">{p.name}</span>
                                <span className="ml-auto font-semibold text-zinc-500 dark:text-zinc-500 whitespace-nowrap">
                                  {val === null ? "—" : val.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                          {team.picks.map((p, j) => {
                            const val = pickValue(p);
                            return (
                              <div key={`${pickLabel(p)}-${p.originalRosterId}-${j}`} className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8px] font-semibold ${POSITION_COLOR.PICK}`}>
                                    PICK
                                  </span>
                                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                                    {pickLabel(p)}
                                    {p.became && (
                                      <>
                                        <span className="text-zinc-400 dark:text-zinc-600"> → </span>
                                        <span className="font-semibold">{p.became.name}</span>
                                      </>
                                    )}
                                  </span>
                                  <span className="ml-auto font-semibold text-zinc-500 dark:text-zinc-500 whitespace-nowrap">
                                    {val === null ? "—" : val.toLocaleString()}
                                  </span>
                                </div>
                                {(p.became || p.laterTraded) && (
                                  <div className="flex items-center gap-1 pl-9 text-[9px] text-zinc-500 dark:text-zinc-600">
                                    {p.became && (
                                      <span>
                                        Pick {p.became.pickLabel}
                                        {p.became.draftedBy && p.laterTraded ? ` · drafted by ${p.became.draftedBy}` : ""}
                                      </span>
                                    )}
                                    {p.laterTraded && (
                                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-px font-semibold text-blue-600 dark:text-blue-400">
                                        re-traded
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {team.faab > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="shrink-0 rounded-full border border-zinc-300 dark:border-zinc-700/40 bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-px text-[8px] font-semibold text-zinc-600 dark:text-zinc-400">
                                FAAB
                              </span>
                              <span className="text-zinc-700 dark:text-zinc-300">${team.faab}</span>
                              <span className="ml-auto font-semibold text-zinc-500 dark:text-zinc-500">—</span>
                            </div>
                          )}
                          {team.players.length === 0 && team.picks.length === 0 && team.faab === 0 && (
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-600 italic">Nothing received</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && visible.filtered.length > INITIAL_SHOWN && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 w-full flex items-center justify-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <FiChevronDown className="h-3.5 w-3.5" />
            Show all {visible.filtered.length} trades
          </button>
        )}

        {!loading && !error && visible.filtered.length > 0 && (
          <p className="mt-2 px-1 text-[9px] text-zinc-500 dark:text-zinc-600">
            Verdicts use today’s FantasyCalc values plus the calculator’s waiver adjustment, so they show who’s winning each trade in hindsight — not how it looked on trade day. Picks whose draft already happened are scored as the player selected with them (“2026 2nd → Player”); “re-traded” means the pick changed hands again after this trade. Assets marked “—” have no current market value.
          </p>
        )}
      </div>
    </div>
  );
}
