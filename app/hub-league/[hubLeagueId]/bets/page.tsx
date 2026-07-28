"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueNav } from "../LeagueNav";
import {
  FiTrendingUp,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiX,
  FiTarget,
  FiUsers,
  FiEdit2,
  FiLock,
} from "react-icons/fi";
import { GiTwoCoins, GiDeathSkull, GiRollingDices, GiPodiumWinner } from "react-icons/gi";

type Profile = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string;
};

type Bet = {
  id: string;
  type: "season" | "h2h";
  stakeType: "coins" | "terms";
  title: string;
  description: string | null;
  terms: string | null;
  amount: number;
  status: "open" | "accepted" | "settled" | "cancelled";
  result: "creator" | "taker" | "push" | null;
  season: string | null;
  week: number | null;
  createdAt: string;
  creator: Profile;
  taker: Profile | null;
};

type Wallet = {
  id: string;
  balance: number;
};

type LineWager = {
  id: string;
  pick: "home" | "away" | "over" | "under";
  stake: number;
  odds: number;
  payout: number | null;
  status: "pending" | "won" | "lost" | "push" | "void";
  profile: { id: number; username: string };
};

type Line = {
  id: string;
  week: number;
  matchupId: number;
  homeName: string;
  awayName: string;
  homeProjected: number;
  awayProjected: number;
  homeOdds: number;
  awayOdds: number;
  totalLine: number;
  overOdds: number;
  underOdds: number;
  status: "open" | "settled" | "void";
  homeScore: number | null;
  awayScore: number | null;
  wagers: LineWager[];
};

type Book = {
  week: number;
  season: string;
  seasonType: string;
  locked: boolean;
  lines: Line[];
};

type FutureOption = {
  id: string;
  label: string;
  rosterId: number | null;
  pick: string | null;
  odds: number;
};

type Future = {
  id: string;
  kind: "champion" | "win_total";
  title: string;
  subjectName: string | null;
  line: number | null;
  status: "open" | "settled" | "void";
  result: string | null;
  finalValue: number | null;
  closesWeek: number;
  options: FutureOption[];
};

type FutureWager = {
  id: string;
  futureId: string;
  optionId: string;
  stake: number;
  odds: number;
  status: "pending" | "won" | "lost" | "void";
  payout: number | null;
};

type FuturesData = {
  season: string;
  seasonType: string;
  week: number;
  locked: boolean;
  futures: Future[];
  myWagers: FutureWager[];
};

type MyWager = {
  id: string;
  pick: "home" | "away" | "over" | "under";
  stake: number;
  odds: number;
  status: "pending" | "won" | "lost" | "push" | "void";
  payout: number | null;
  settledAt: string | null;
  line: {
    id: string;
    week: number;
    season: string;
    homeName: string;
    awayName: string;
    totalLine: number;
    status: "open" | "settled" | "void";
  };
};

type Standing = {
  profileId: number;
  username: string;
  name: string;
  profileImage: string | null;
  balance: number;
  house: { wins: number; losses: number; pushes: number; net: number; biggestWin: number; pending: number };
  p2p: { wins: number; losses: number; net: number };
  totalNet: number;
};

const STATUS_STYLE: Record<string, string> = {
  open: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  accepted: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  settled: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  open: <FiClock className="h-3 w-3" />,
  accepted: <FiTarget className="h-3 w-3" />,
  settled: <FiCheckCircle className="h-3 w-3" />,
  cancelled: <FiXCircle className="h-3 w-3" />,
};

const PUNISHMENT_IDEAS = [
  "24 hours in a Waffle House — every waffle eaten knocks off an hour",
  "Take the full SAT and share the score report with the league",
  "Perform 5 minutes of stand-up comedy at a real open mic night",
  "Recreate a maternity-style photoshoot and send the album to the league",
  "Milk Mile: chug a glass of milk, run a lap, repeat four times",
  "Wear the league champion's jersey to every draft event next season",
  "Get roasted by the league for 10 minutes — no talking back allowed",
  "Buy the entire league's food and drinks at next season's draft",
  "Wear a shirt with the champion's face on it for a full week",
  "Let the champion pick your team name and avatar for all of next season",
  "Post a public video singing the league champion's praises",
  "Dress up as a hot dog and take photos at five different gas stations",
  "Eat a spoonful of the hottest hot sauce the league can find, on camera",
  "Write and recite a heartfelt poem honoring the league champion",
];

// ─── Punishment Bar ──────────────────────────────────────────────────────
function PunishmentBar({
  hubLeagueId,
  punishment,
  isOwner,
  onUpdated,
}: {
  hubLeagueId: string;
  punishment: string | null;
  isOwner: boolean;
  onUpdated: (punishment: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/punishment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ punishment: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save punishment");
        return;
      }
      const data = await res.json();
      onUpdated(data.punishment ?? null);
      setEditing(false);
      setDraft("");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function randomPick() {
    const pool = PUNISHMENT_IDEAS.filter((p) => p !== punishment);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const inputClass =
    "flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40";

  const showForm = isOwner && (editing || !punishment);

  return (
    <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/[0.04] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
          <GiDeathSkull className="h-5 w-5 text-red-400" />
        </div>

        {showForm ? (
          <form
            className="flex flex-1 flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) save(draft.trim());
            }}
          >
            <input
              className={inputClass}
              placeholder="Set the last-place punishment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={300}
              autoFocus={editing}
            />
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="rounded-lg bg-red-500/90 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Set"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(randomPick())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
            >
              <GiRollingDices className="h-4 w-4" />
              Randomize
            </button>
            {editing && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setDraft("");
                  setError(null);
                }}
                className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            )}
          </form>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400/80">
                League Punishment
              </p>
              {punishment ? (
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  {punishment}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400 dark:text-zinc-500">
                  No punishment set yet — the commissioner hasn&apos;t decided
                  last place&apos;s fate.
                </p>
              )}
            </div>
            {isOwner && punishment && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  disabled={saving}
                  onClick={() => save(randomPick())}
                  title="Randomize punishment"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  <GiRollingDices className="h-4 w-4" />
                </button>
                <button
                  disabled={saving}
                  onClick={() => {
                    setDraft(punishment);
                    setEditing(true);
                  }}
                  title="Edit punishment"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 transition hover:text-gray-600 dark:hover:text-zinc-300"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Create Bet Modal ────────────────────────────────────────────────────
function CreateBetModal({
  hubLeagueId,
  initialType,
  onClose,
  onCreated,
}: {
  hubLeagueId: string;
  initialType: "season" | "h2h";
  onClose: () => void;
  onCreated: (bet: Bet) => void;
}) {
  const [type, setType] = useState<"season" | "h2h">(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState("");
  const [amount, setAmount] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [week, setWeek] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerms = type === "h2h";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedAmount = parseInt(amount, 10);
    if (isTerms) {
      if (!terms.trim()) {
        setError("Enter the stakes for this bet");
        setSaving(false);
        return;
      }
    } else if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid wager amount");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/bets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || null,
          terms: isTerms ? terms.trim() : null,
          amount: isTerms ? 0 : parsedAmount,
          season: type === "season" ? season : null,
          week: type === "h2h" && week ? parseInt(week, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create bet");
        setSaving(false);
        return;
      }

      const data = await res.json();
      onCreated(data.bet);
      onClose();
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#F4D06F]/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <FiX className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-zinc-100">Create a Bet</h2>
        <p className="mb-5 text-xs text-gray-400 dark:text-zinc-500">
          {isTerms
            ? "Challenge a manager — set your own stakes, no coins. Winner takes the record."
            : "Propose a wager — another member can accept the other side."}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["season", "h2h"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  type === t
                    ? "border-[#F4D06F]/40 bg-[#F4D06F]/10 text-[#F4D06F]"
                    : "border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-gray-300 dark:hover:border-zinc-600"
                }`}
              >
                {t === "season" ? "Season Outcome" : "Head-to-Head"}
              </button>
            ))}
          </div>

          <input
            className={inputClass}
            placeholder={
              type === "season"
                ? 'e.g. "Darius wins the championship"'
                : 'e.g. "I beat Mike in Week 8"'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            className={inputClass + " resize-none"}
            rows={2}
            placeholder="Optional details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {isTerms ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  Stakes
                </label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder='e.g. "Loser buys lunch"'
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  Week
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={18}
                  placeholder="1"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  Wager Amount
                </label>
                <div className="relative">
                  <GiTwoCoins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F4D06F]" />
                  <input
                    className={inputClass + " pl-9"}
                    type="number"
                    min={1}
                    placeholder="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  Season
                </label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="2025"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !title.trim() || (isTerms ? !terms.trim() : !amount)}
            className="w-full rounded-lg bg-[#F4D06F] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c35e] disabled:opacity-40"
          >
            {saving ? "Creating…" : "Post Bet"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Settle Modal ────────────────────────────────────────────────────────
function SettleModal({
  bet,
  hubLeagueId,
  onClose,
  onSettled,
}: {
  bet: Bet;
  hubLeagueId: string;
  onClose: () => void;
  onSettled: (bet: Bet) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function settle(result: "creator" | "taker" | "push") {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/hub-leagues/${hubLeagueId}/bets/${bet.id}/settle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to settle");
        setSaving(false);
        return;
      }

      const data = await res.json();
      onSettled(data.bet);
      onClose();
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <FiX className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-zinc-100">Settle Bet</h2>
        <p className="mb-2 text-sm text-gray-600 dark:text-zinc-300">{bet.title}</p>
        <p className="mb-5 text-xs text-gray-400 dark:text-zinc-500">
          {bet.creator.username} vs {bet.taker?.username}
          {bet.stakeType === "terms"
            ? bet.terms
              ? ` — ${bet.terms}`
              : " — bragging rights"
            : ` — ${bet.amount.toLocaleString()} coins each`}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            disabled={saving}
            onClick={() => settle("creator")}
            className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {bet.creator.username} Wins
          </button>
          <button
            disabled={saving}
            onClick={() => settle("taker")}
            className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-40"
          >
            {bet.taker?.username} Wins
          </button>
          <button
            disabled={saving}
            onClick={() => settle("push")}
            className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-gray-400 dark:text-zinc-500 transition hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            {bet.stakeType === "terms" ? "Call It Off (Push)" : "Push (Refund Both)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bet Card ────────────────────────────────────────────────────────────
function BetCard({
  bet,
  currentProfileId,
  isOwner,
  onAccept,
  onSettle,
}: {
  bet: Bet;
  currentProfileId: number | null;
  isOwner: boolean;
  onAccept: (bet: Bet) => void;
  onSettle: (bet: Bet) => void;
}) {
  const canAccept =
    bet.status === "open" && currentProfileId !== null && bet.creator.id !== currentProfileId;
  const canSettle = bet.status === "accepted" && isOwner;

  const resultLabel =
    bet.result === "creator"
      ? `${bet.creator.username} won`
      : bet.result === "taker"
      ? `${bet.taker?.username} won`
      : bet.result === "push"
      ? "Push"
      : null;

  return (
    <li className="hub-inner-card flex items-start gap-3 rounded-xl px-4 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          bet.type === "season" ? "bg-[#F4D06F]/10" : "bg-blue-500/10"
        }`}
      >
        {bet.type === "season" ? (
          <FiTrendingUp className="h-4 w-4 text-[#F4D06F]" />
        ) : (
          <FiUsers className="h-4 w-4 text-blue-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{bet.title}</p>
        {bet.description && (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{bet.description}</p>
        )}
        {bet.stakeType === "terms" && bet.terms && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-500 dark:text-blue-400">
            <GiPodiumWinner className="h-3 w-3" />
            {bet.terms}
          </p>
        )}
        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
          {bet.creator.username}
          {bet.taker ? (
            <>
              {" "}
              <span className="text-gray-300 dark:text-zinc-700">vs</span> {bet.taker.username}
            </>
          ) : (
            <span className="text-amber-400/70"> — waiting for opponent</span>
          )}
          {bet.season && ` · ${bet.season}`}
          {bet.week && ` · Wk ${bet.week}`}
        </p>
        {resultLabel && (
          <p className="mt-1 text-xs font-semibold text-emerald-400">{resultLabel}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {bet.stakeType === "terms" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400">
            Pride
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-800 dark:text-zinc-200">
            <GiTwoCoins className="h-3.5 w-3.5 text-[#F4D06F]" />
            {bet.amount.toLocaleString()}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
            STATUS_STYLE[bet.status]
          }`}
        >
          {STATUS_ICON[bet.status]} {bet.status}
        </span>
        {canAccept && (
          <button
            onClick={() => onAccept(bet)}
            className="mt-1 rounded-md bg-[#F4D06F] px-2.5 py-1 text-[10px] font-bold text-black transition hover:bg-[#e6c35e]"
          >
            Accept
          </button>
        )}
        {canSettle && (
          <button
            onClick={() => onSettle(bet)}
            className="mt-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            Settle
          </button>
        )}
      </div>
    </li>
  );
}

// ─── The Book (house lines) ──────────────────────────────────────────────
const PICK_LABEL: Record<LineWager["pick"], string> = {
  home: "ML",
  away: "ML",
  over: "Over",
  under: "Under",
};

const WAGER_STATUS_STYLE: Record<LineWager["status"], string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  lost: "border-red-500/30 bg-red-500/10 text-red-400",
  push: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  void: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

function OddsButton({
  label,
  odds,
  active,
  disabled,
  onClick,
}: {
  label: string;
  odds: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-[#F4D06F]/50 bg-[#F4D06F]/15 text-[#F4D06F]"
          : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-[#F4D06F]/40 hover:text-[#F4D06F]"
      }`}
    >
      <span className="text-gray-400 dark:text-zinc-500 font-medium">{label}</span>
      {odds.toFixed(2)}x
    </button>
  );
}

function LineCard({
  line,
  locked,
  currentProfileId,
  balance,
  onPlaced,
}: {
  line: Line;
  locked: boolean;
  currentProfileId: number | null;
  balance: number | null;
  onPlaced: (lineId: string, wager: LineWager) => void;
}) {
  const [pick, setPick] = useState<LineWager["pick"] | null>(null);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const myWagers = line.wagers.filter((w) => w.profile.id === currentProfileId);
  const otherCount = line.wagers.length - myWagers.length;
  const betting = !locked && line.status === "open";

  const oddsFor = (p: LineWager["pick"]) =>
    p === "home"
      ? line.homeOdds
      : p === "away"
      ? line.awayOdds
      : p === "over"
      ? line.overOdds
      : line.underOdds;

  const pickDescription = (p: LineWager["pick"]) =>
    p === "home"
      ? `${line.homeName} wins`
      : p === "away"
      ? `${line.awayName} wins`
      : p === "over"
      ? `Over ${line.totalLine}`
      : `Under ${line.totalLine}`;

  const alreadyPicked = (p: LineWager["pick"]) => myWagers.some((w) => w.pick === p);

  function togglePick(p: LineWager["pick"]) {
    setError(null);
    setPick((prev) => (prev === p ? null : p));
  }

  async function placeWager() {
    if (!pick) return;
    const parsedStake = parseInt(stake, 10);
    if (!parsedStake || parsedStake <= 0) {
      setError("Enter a valid stake");
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hub-leagues/${hubLeagueId}/lines/${line.id}/wager`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pick, stake: parsedStake }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to place wager");
        return;
      }
      const data = await res.json();
      onPlaced(line.id, data.wager);
      setPick(null);
      setStake("");
    } catch {
      setError("Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  const stakeNum = parseInt(stake, 10) || 0;
  const potential = pick ? Math.floor(stakeNum * oddsFor(pick)) : 0;

  return (
    <li className="hub-inner-card rounded-xl px-4 py-3">
      {/* Moneyline rows */}
      {(["home", "away"] as const).map((side) => {
        const name = side === "home" ? line.homeName : line.awayName;
        const projected = side === "home" ? line.homeProjected : line.awayProjected;
        const score = side === "home" ? line.homeScore : line.awayScore;
        return (
          <div key={side} className="flex items-center justify-between gap-2 py-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {name}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                {line.status === "settled"
                  ? `Final: ${score?.toFixed(2) ?? "—"}`
                  : `Proj ${projected.toFixed(1)}`}
              </p>
            </div>
            {betting && (
              <OddsButton
                label="ML"
                odds={oddsFor(side)}
                active={pick === side}
                disabled={alreadyPicked(side)}
                onClick={() => togglePick(side)}
              />
            )}
          </div>
        );
      })}

      {/* Total row */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-zinc-800 pt-2">
        <p className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
          Total <span className="font-bold text-gray-600 dark:text-zinc-300">{line.totalLine}</span>
        </p>
        {betting ? (
          <div className="flex gap-1.5">
            <OddsButton
              label="Over"
              odds={line.overOdds}
              active={pick === "over"}
              disabled={alreadyPicked("over")}
              onClick={() => togglePick("over")}
            />
            <OddsButton
              label="Under"
              odds={line.underOdds}
              active={pick === "under"}
              disabled={alreadyPicked("under")}
              onClick={() => togglePick("under")}
            />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
            {line.status === "open" ? (
              <>
                <FiLock className="h-3 w-3" /> Locked
              </>
            ) : (
              <span className="capitalize">{line.status}</span>
            )}
          </span>
        )}
      </div>

      {/* Stake entry */}
      {pick && betting && (
        <div className="mt-3 rounded-lg border border-[#F4D06F]/25 bg-[#F4D06F]/5 p-3">
          <p className="mb-2 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
            {pickDescription(pick)} @ {oddsFor(pick).toFixed(2)}x
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <GiTwoCoins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#F4D06F]" />
              <input
                type="number"
                min={1}
                max={balance ?? undefined}
                placeholder="Stake"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 pl-8 pr-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#F4D06F]/50"
              />
            </div>
            <button
              disabled={placing || !stakeNum}
              onClick={placeWager}
              className="rounded-lg bg-[#F4D06F] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#e6c35e] disabled:opacity-40"
            >
              {placing ? "Placing…" : "Place"}
            </button>
          </div>
          {stakeNum > 0 && (
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-zinc-500">
              Pays <span className="font-bold text-[#F4D06F]">{potential.toLocaleString()}</span>{" "}
              ({(potential - stakeNum).toLocaleString()} profit)
            </p>
          )}
          {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
        </div>
      )}

      {/* My wagers + activity */}
      {(myWagers.length > 0 || otherCount > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {myWagers.map((w) => (
            <span
              key={w.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                WAGER_STATUS_STYLE[w.status]
              }`}
            >
              {w.pick === "home"
                ? line.homeName
                : w.pick === "away"
                ? line.awayName
                : PICK_LABEL[w.pick]}{" "}
              · {w.stake.toLocaleString()} @ {w.odds.toFixed(2)}x
              {w.status !== "pending" &&
                ` · ${w.status === "won" ? `+${w.payout?.toLocaleString()}` : w.status}`}
            </span>
          ))}
          {otherCount > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
              {otherCount} other wager{otherCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Season Futures (in The Book) ────────────────────────────────────────
function FutureOptionRow({
  option,
  future,
  balance,
  locked,
  myWager,
  hubLeagueId,
  onPlaced,
}: {
  option: FutureOption;
  future: Future;
  balance: number | null;
  locked: boolean;
  myWager: FutureWager | undefined;
  hubLeagueId: string;
  onPlaced: (wager: FutureWager) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bettable = !locked && future.status === "open" && !myWager;
  const stakeNum = parseInt(stake, 10) || 0;

  async function place() {
    if (!stakeNum) {
      setError("Enter a stake");
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/futures/${future.id}/wager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: option.id, stake: stakeNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to place bet");
        return;
      }
      onPlaced(data.wager);
      setOpen(false);
      setStake("");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 dark:border-zinc-800/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
          {option.label}
        </p>
        {myWager ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              myWager.status === "pending"
                ? "border-[#F4D06F]/30 bg-[#F4D06F]/10 text-[#F4D06F]"
                : WAGER_STATUS_STYLE[myWager.status]
            }`}
          >
            {myWager.status === "pending"
              ? `${myWager.stake.toLocaleString()} @ ${myWager.odds.toFixed(2)}x`
              : myWager.status === "won"
              ? `+${myWager.payout?.toLocaleString()}`
              : myWager.status}
          </span>
        ) : bettable ? (
          <OddsButton
            label="Bet"
            odds={option.odds}
            active={open}
            disabled={false}
            onClick={() => { setOpen((v) => !v); setError(null); }}
          />
        ) : (
          <span className="shrink-0 text-xs font-semibold text-gray-400 dark:text-zinc-500">
            {option.odds.toFixed(2)}x
          </span>
        )}
      </div>

      {open && bettable && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <GiTwoCoins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#F4D06F]" />
            <input
              type="number"
              min={1}
              max={balance ?? undefined}
              placeholder="Stake"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 pl-8 pr-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#F4D06F]/50"
            />
          </div>
          <button
            disabled={placing || !stakeNum}
            onClick={place}
            className="rounded-lg bg-[#F4D06F] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#e6c35e] disabled:opacity-40"
          >
            {placing ? "…" : "Place"}
          </button>
        </div>
      )}
      {open && bettable && stakeNum > 0 && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
          Pays <span className="font-bold text-[#F4D06F]">{Math.floor(stakeNum * option.odds).toLocaleString()}</span>
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

function FuturesSection({
  data,
  loading,
  balance,
  hubLeagueId,
  onPlaced,
}: {
  data: FuturesData | null;
  loading: boolean;
  balance: number | null;
  hubLeagueId: string;
  onPlaced: (wager: FutureWager) => void;
}) {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />;
  }
  if (!data || data.futures.length === 0) {
    return (
      <section className="hub-card p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Season Futures</h2>
        <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500 italic">
          {data?.seasonType === "post"
            ? "Season futures open again next year."
            : "Futures will appear once the league's rosters and standings are available."}
        </p>
      </section>
    );
  }

  const wagerFor = (optionId: string) => data.myWagers.find((w) => w.optionId === optionId);
  const champion = data.futures.find((f) => f.kind === "champion");
  const winTotals = data.futures.filter((f) => f.kind === "win_total");

  return (
    <section className="hub-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Season Futures</h2>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
            League champion & team win totals — odds locked at open, settle at season&apos;s end
          </p>
        </div>
        {data.locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
            <FiLock className="h-3 w-3" /> Closed
          </span>
        )}
      </div>

      {/* League champion */}
      {champion && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            League Champion
          </p>
          <div className="space-y-1.5">
            {champion.options.map((o) => (
              <FutureOptionRow
                key={o.id}
                option={o}
                future={champion}
                balance={balance}
                locked={data.locked}
                myWager={wagerFor(o.id)}
                hubLeagueId={hubLeagueId}
                onPlaced={onPlaced}
              />
            ))}
          </div>
        </div>
      )}

      {/* Win totals */}
      {winTotals.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Win Totals
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {winTotals.map((f) => (
              <div key={f.id} className="rounded-xl border border-gray-100 dark:border-zinc-800/60 p-2.5">
                <p className="mb-1.5 truncate text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  {f.subjectName}
                  <span className="ml-1 font-normal text-gray-400 dark:text-zinc-500">
                    o/u {f.line}
                  </span>
                </p>
                <div className="space-y-1">
                  {f.options.map((o) => (
                    <FutureOptionRow
                      key={o.id}
                      option={o}
                      future={f}
                      balance={balance}
                      locked={data.locked}
                      myWager={wagerFor(o.id)}
                      hubLeagueId={hubLeagueId}
                      onPlaced={onPlaced}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BookSection({
  book,
  loading,
  currentProfileId,
  balance,
  onPlaced,
}: {
  book: Book | null;
  loading: boolean;
  currentProfileId: number | null;
  balance: number | null;
  onPlaced: (lineId: string, wager: LineWager) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />
        ))}
      </div>
    );
  }

  if (!book) {
    return (
      <section className="hub-card p-5">
        <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
          Couldn&apos;t load this week&apos;s lines.
        </p>
      </section>
    );
  }

  // Flatten the current user's still-pending wagers across every line so they
  // have one clear place to see the house bets they have in play.
  const myOpenWagers = book.lines.flatMap((line) =>
    line.wagers
      .filter((w) => w.profile.id === currentProfileId && w.status === "pending")
      .map((w) => ({ line, wager: w }))
  );
  const totalAtRisk = myOpenWagers.reduce((sum, { wager }) => sum + wager.stake, 0);
  const pickText = (line: Line, w: LineWager) =>
    w.pick === "home"
      ? `${line.homeName} ML`
      : w.pick === "away"
      ? `${line.awayName} ML`
      : w.pick === "over"
      ? `Over ${line.totalLine}`
      : `Under ${line.totalLine}`;

  return (
    <>
      {myOpenWagers.length > 0 && (
        <section className="mb-3 hub-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Your Open Wagers
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                In play until the week settles Tuesday
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-1 text-sm font-black text-gray-900 dark:text-zinc-100">
                <GiTwoCoins className="h-3.5 w-3.5 text-[#F4D06F]" />
                {totalAtRisk.toLocaleString()}
              </span>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">at risk</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {myOpenWagers.map(({ line, wager }) => (
              <li
                key={wager.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    {pickText(line, wager)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                    Wk {line.week} · {line.awayName} @ {line.homeName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                    {wager.stake.toLocaleString()} @ {wager.odds.toFixed(2)}x
                  </p>
                  <p className="text-[10px] text-[#F4D06F]">
                    pays {Math.floor(wager.stake * wager.odds).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

    <section className="hub-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Week {book.week} Lines
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
            House odds from live projections — settled automatically after the week
          </p>
        </div>
        {book.locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
            <FiLock className="h-3 w-3" /> Locked until Tuesday
          </span>
        )}
      </div>

      {book.lines.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
          {book.seasonType === "regular"
            ? "No lines available for this week yet — check back soon."
            : "Week 1 lines will appear once Sleeper publishes matchups and projections for the new season."}
        </p>
      ) : (
        <ul className="space-y-3">
          {book.lines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              locked={book.locked}
              currentProfileId={currentProfileId}
              balance={balance}
              onPlaced={onPlaced}
            />
          ))}
        </ul>
      )}
    </section>
    </>
  );
}

// ─── Active (unified in-play view) ───────────────────────────────────────
function wagerPickLabel(
  line: { homeName: string; awayName: string; totalLine: number },
  pick: MyWager["pick"]
) {
  return pick === "home"
    ? `${line.homeName} ML`
    : pick === "away"
    ? `${line.awayName} ML`
    : pick === "over"
    ? `Over ${line.totalLine}`
    : `Under ${line.totalLine}`;
}

function WagerRow({ wager }: { wager: MyWager }) {
  const pending = wager.status === "pending";
  return (
    <li className="hub-inner-card flex items-center gap-3 rounded-xl px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4D06F]/10">
        <GiTwoCoins className="h-4 w-4 text-[#F4D06F]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
          {wagerPickLabel(wager.line, wager.pick)}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-zinc-500">
          The Book · Wk {wager.line.week} · {wager.line.awayName} @ {wager.line.homeName}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
        <span className="text-sm font-bold text-gray-800 dark:text-zinc-200">
          {wager.stake.toLocaleString()} @ {wager.odds.toFixed(2)}x
        </span>
        {pending ? (
          <span className="text-[10px] text-[#F4D06F]">
            pays {Math.floor(wager.stake * wager.odds).toLocaleString()}
          </span>
        ) : (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
              WAGER_STATUS_STYLE[wager.status]
            }`}
          >
            {wager.status === "won" ? `+${wager.payout?.toLocaleString()}` : wager.status}
          </span>
        )}
      </div>
    </li>
  );
}

function ActiveSection({
  myWagers,
  wagersLoading,
  futuresData,
  bets,
  currentProfileId,
  isOwner,
  onAccept,
  onSettle,
}: {
  myWagers: MyWager[];
  wagersLoading: boolean;
  futuresData: FuturesData | null;
  bets: Bet[];
  currentProfileId: number | null;
  isOwner: boolean;
  onAccept: (bet: Bet) => void;
  onSettle: (bet: Bet) => void;
}) {
  const pendingWagers = myWagers.filter((w) => w.status === "pending");
  const activeBets = bets.filter((b) => b.status === "accepted");
  const openBets = bets.filter((b) => b.status === "open");

  // Pending futures wagers, resolved to their market + option for display
  const pendingFutures = (futuresData?.myWagers ?? [])
    .filter((w) => w.status === "pending")
    .map((w) => {
      const future = futuresData?.futures.find((f) => f.id === w.futureId);
      const option = future?.options.find((o) => o.id === w.optionId);
      return { wager: w, future, option };
    })
    .filter((x) => x.future && x.option);

  const inPlayCount = pendingWagers.length + activeBets.length + pendingFutures.length;

  if (wagersLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />
        ))}
      </div>
    );
  }

  if (inPlayCount === 0 && openBets.length === 0) {
    return (
      <div className="hub-card p-8 text-center">
        <p className="text-sm text-gray-400 dark:text-zinc-500">Nothing in play right now.</p>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-600">
          Place a house wager in The Book or challenge a manager in H2H.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* In play — your house wagers + accepted peer bets */}
      <section className="hub-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">In Play</h2>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
              Wagers and bets that are locked in
            </p>
          </div>
          <span className="rounded-full bg-gray-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
            {inPlayCount}
          </span>
        </div>
        {inPlayCount === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">Nothing locked in yet.</p>
        ) : (
          <ul className="space-y-2">
            {pendingWagers.map((w) => (
              <WagerRow key={w.id} wager={w} />
            ))}
            {pendingFutures.map(({ wager, future, option }) => (
              <li key={wager.id} className="hub-inner-card flex items-center gap-3 rounded-xl px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <FiTrendingUp className="h-4 w-4 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
                    {future!.kind === "champion" ? `${option!.label} — Champion` : `${future!.subjectName} · ${option!.label}`}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                    Futures · settles at season&apos;s end
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">
                    {wager.stake.toLocaleString()} @ {wager.odds.toFixed(2)}x
                  </p>
                  <p className="text-[10px] text-[#F4D06F]">
                    pays {Math.floor(wager.stake * wager.odds).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
            {activeBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentProfileId={currentProfileId}
                isOwner={isOwner}
                onAccept={onAccept}
                onSettle={onSettle}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Waiting for an opponent — open peer bets anyone can accept */}
      {openBets.length > 0 && (
        <section className="hub-card p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Waiting for an Opponent
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
              Open challenges — take the other side
            </p>
          </div>
          <ul className="space-y-2">
            {openBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentProfileId={currentProfileId}
                isOwner={isOwner}
                onAccept={onAccept}
                onSettle={onSettle}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────
// ─── Standings (coin leaderboard + records) ──────────────────────────────
function StandingsSection({
  standings,
  loading,
  currentProfileId,
}: {
  standings: Standing[] | null;
  loading: boolean;
  currentProfileId: number | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />
        ))}
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="hub-card p-8 text-center">
        <p className="text-sm text-gray-400 dark:text-zinc-500">No standings yet.</p>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-600">
          Standings appear once members start placing bets.
        </p>
      </div>
    );
  }

  return (
    <section className="hub-card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Coin Standings</h2>
        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
          Wallet balances and betting records across the league
        </p>
      </div>
      <ul className="space-y-1.5">
        {standings.map((s, i) => {
          const isMe = s.profileId === currentProfileId;
          const houseRecord = `${s.house.wins}-${s.house.losses}${s.house.pushes > 0 ? `-${s.house.pushes}` : ""}`;
          const p2pRecord = `${s.p2p.wins}-${s.p2p.losses}`;
          return (
            <li
              key={s.profileId}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isMe
                  ? "border-[#F4D06F]/40 bg-[#F4D06F]/5"
                  : "border-gray-200 dark:border-zinc-800/50 bg-gray-50 dark:bg-zinc-900/40"
              }`}
            >
              <span className={`w-6 shrink-0 text-center text-sm font-black ${i < 3 ? "text-[#F4D06F]" : "text-gray-400 dark:text-zinc-600"}`}>
                {i + 1}
              </span>
              {s.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.profileImage}
                  alt={s.name}
                  className="h-8 w-8 shrink-0 rounded-full border border-gray-200 dark:border-zinc-700 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                  {s.name[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {s.name}
                  {isMe && <span className="ml-1.5 text-[10px] font-semibold text-[#F4D06F]">You</span>}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Book {houseRecord} · H2H {p2pRecord}
                  {s.house.pending > 0 && (
                    <>
                      {" · "}
                      <span className="text-amber-500 dark:text-amber-400">
                        {s.house.pending.toLocaleString()} at risk
                      </span>
                    </>
                  )}
                </p>
              </div>
              {s.house.biggestWin > 0 && (
                <div className="hidden sm:block shrink-0 text-right">
                  <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    +{s.house.biggestWin.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-600">best hit</p>
                </div>
              )}
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  s.totalNet > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                    : s.totalNet < 0
                      ? "border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400"
                      : "border-zinc-500/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {s.totalNet > 0 ? "+" : ""}
                {s.totalNet.toLocaleString()}
              </span>
              <div className="flex w-20 shrink-0 items-center justify-end gap-1">
                <GiTwoCoins className="h-3.5 w-3.5 text-[#F4D06F]" />
                <span className="text-sm font-black text-gray-900 dark:text-zinc-100">
                  {s.balance.toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] text-gray-400 dark:text-zinc-600">
        Net counts settled Book wagers and H2H/season bets. Pushes and voided lines refund the stake.
      </p>
    </section>
  );
}

export default function BetsPage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const [loading, setLoading] = useState(true);
  const [hubLeague, setHubLeague] = useState<{
    name: string;
    punishment?: string | null;
  } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<number | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "book" | "h2h" | "season" | "standings">("active");
  const [showCreate, setShowCreate] = useState(false);
  const [settleBet, setSettleBet] = useState<Bet | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookFetched, setBookFetched] = useState(false);
  const [futuresData, setFuturesData] = useState<FuturesData | null>(null);
  const [futuresLoading, setFuturesLoading] = useState(false);
  const [futuresFetched, setFuturesFetched] = useState(false);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsFetched, setStandingsFetched] = useState(false);
  const [myWagers, setMyWagers] = useState<MyWager[]>([]);
  const [wagersLoading, setWagersLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!hubLeagueId) return;
    try {
      const [leagueRes, walletRes, betsRes, wagersRes] = await Promise.all([
        fetch(`/api/hub-leagues/${hubLeagueId}`),
        fetch(`/api/hub-leagues/${hubLeagueId}/wallet`),
        fetch(`/api/hub-leagues/${hubLeagueId}/bets`),
        fetch(`/api/hub-leagues/${hubLeagueId}/bets/my-wagers`),
      ]);

      if (!leagueRes.ok) {
        const d = await leagueRes.json().catch(() => ({}));
        setError(d.error ?? "Failed to load league");
        return;
      }

      const leagueData = await leagueRes.json();
      setHubLeague(leagueData.hubLeague ?? null);
      setIsOwner(leagueData.isOwner ?? false);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData.wallet);
        setCurrentProfileId(walletData.profileId ?? null);
      }

      if (betsRes.ok) {
        const betsData = await betsRes.json();
        setBets(betsData.bets ?? []);
      }

      if (wagersRes.ok) {
        const wagersData = await wagersRes.json();
        setMyWagers(wagersData.wagers ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setWagersLoading(false);
    }
  }, [hubLeagueId]);

  const refreshMyWagers = useCallback(() => {
    fetch(`/api/hub-leagues/${hubLeagueId}/bets/my-wagers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.wagers) setMyWagers(d.wagers); })
      .catch(() => {});
  }, [hubLeagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lazy-load the book the first time the tab is opened (line generation can
  // take a few Sleeper round-trips on the week's first visit)
  useEffect(() => {
    if (tab !== "book" || bookFetched || !hubLeagueId) return;
    setBookFetched(true);
    setBookLoading(true);
    fetch(`/api/hub-leagues/${hubLeagueId}/lines`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBook(d))
      .catch(() => setBook(null))
      .finally(() => setBookLoading(false));
  }, [tab, bookFetched, hubLeagueId]);

  // Load season futures once on mount — the unified Active view and the Book
  // tab both read from this. First load may generate the markets (a few Sleeper
  // round-trips); it runs off the critical path so the page stays responsive.
  useEffect(() => {
    if (futuresFetched || !hubLeagueId) return;
    setFuturesFetched(true);
    setFuturesLoading(true);
    fetch(`/api/hub-leagues/${hubLeagueId}/futures`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFuturesData(d))
      .catch(() => setFuturesData(null))
      .finally(() => setFuturesLoading(false));
  }, [futuresFetched, hubLeagueId]);

  // Lazy-load standings the first time the tab is opened
  useEffect(() => {
    if (tab !== "standings" || standingsFetched || !hubLeagueId) return;
    setStandingsFetched(true);
    setStandingsLoading(true);
    fetch(`/api/hub-leagues/${hubLeagueId}/bets/leaderboard`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStandings(d?.standings ?? null))
      .catch(() => setStandings(null))
      .finally(() => setStandingsLoading(false));
  }, [tab, standingsFetched, hubLeagueId]);

  function handleWagerPlaced(lineId: string, wager: LineWager) {
    setBook((prev) =>
      prev
        ? {
            ...prev,
            lines: prev.lines.map((l) =>
              l.id === lineId ? { ...l, wagers: [...l.wagers, wager] } : l
            ),
          }
        : prev
    );
    // Refresh wallet
    fetch(`/api/hub-leagues/${hubLeagueId}/wallet`)
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet))
      .catch(() => {});
    // Keep the unified Active view in sync with the new wager
    refreshMyWagers();
  }

  function handleFuturePlaced(wager: FutureWager) {
    setFuturesData((prev) =>
      prev ? { ...prev, myWagers: [...prev.myWagers, wager] } : prev
    );
    // Refresh wallet
    fetch(`/api/hub-leagues/${hubLeagueId}/wallet`)
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet))
      .catch(() => {});
  }

  async function handleAccept(bet: Bet) {
    setAccepting(bet.id);
    try {
      const res = await fetch(
        `/api/hub-leagues/${hubLeagueId}/bets/${bet.id}/accept`,
        { method: "POST" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to accept bet");
        return;
      }
      const data = await res.json();
      setBets((prev) => prev.map((b) => (b.id === bet.id ? data.bet : b)));
      // Refresh wallet
      const walletRes = await fetch(`/api/hub-leagues/${hubLeagueId}/wallet`);
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData.wallet);
      }
    } finally {
      setAccepting(null);
    }
  }

  function handleBetCreated(bet: Bet) {
    setBets((prev) => [bet, ...prev]);
    // Jump to the tab matching the new bet so the creator always sees it — but
    // the Active tab already lists open bets, so stay put when creating there.
    if (tab !== "active" && (bet.type === "season" || bet.type === "h2h")) setTab(bet.type);
    // Refresh wallet
    fetch(`/api/hub-leagues/${hubLeagueId}/wallet`)
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet))
      .catch(() => {});
  }

  function handleSettled(bet: Bet) {
    setBets((prev) => prev.map((b) => (b.id === bet.id ? bet : b)));
    // Refresh wallet
    fetch(`/api/hub-leagues/${hubLeagueId}/wallet`)
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet))
      .catch(() => {});
  }

  const pageShell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-gray-800 dark:text-zinc-200">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) {
    return pageShell(
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-zinc-800/60" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-zinc-800/30" />
      </div>
    );
  }

  if (error || !hubLeague) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-red-400 mb-3">{error ?? "Hub league not found."}</p>
        <button
          className="text-sm text-[#F4D06F] hover:underline"
          onClick={() => router.back()}
        >
          &larr; Go back
        </button>
      </div>
    );
  }

  const filtered = bets.filter((b) => b.type === tab);
  const openBets = filtered.filter((b) => b.status === "open");
  const activeBets = filtered.filter((b) => b.status === "accepted");
  const settledBets = filtered.filter(
    (b) => b.status === "settled" || b.status === "cancelled"
  );

  const totalWon = bets
    .filter(
      (b) =>
        b.status === "settled" &&
        ((b.result === "creator" && b.creator.id === currentProfileId) ||
          (b.result === "taker" && b.taker?.id === currentProfileId))
    )
    .reduce((sum, b) => sum + b.amount, 0);

  const totalLost = bets
    .filter(
      (b) =>
        b.status === "settled" &&
        ((b.result === "taker" && b.creator.id === currentProfileId) ||
          (b.result === "creator" && b.taker?.id === currentProfileId))
    )
    .reduce((sum, b) => sum + b.amount, 0);

  return pageShell(
    <>
      {showCreate && (
        <CreateBetModal
          hubLeagueId={hubLeagueId}
          initialType={tab === "season" ? "season" : "h2h"}
          onClose={() => setShowCreate(false)}
          onCreated={handleBetCreated}
        />
      )}

      {settleBet && (
        <SettleModal
          bet={settleBet}
          hubLeagueId={hubLeagueId}
          onClose={() => setSettleBet(null)}
          onSettled={handleSettled}
        />
      )}

      {/* ─── League Punishment Bar ─────────────────── */}
      <PunishmentBar
        hubLeagueId={hubLeagueId}
        punishment={hubLeague.punishment ?? null}
        isOwner={isOwner}
        onUpdated={(punishment) =>
          setHubLeague((prev) => (prev ? { ...prev, punishment } : prev))
        }
      />

      {/* ─── Header ────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-zinc-800/70 bg-gray-50 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">
          <FiTrendingUp className="h-3 w-3 text-[#F4D06F]" />
          Bets &middot; {hubLeague.name}
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">
          Betting Board
        </h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-500">
          Wager virtual coins on season outcomes and head-to-head matchups.
        </p>
      </div>

      {/* ─── Wallet + Stats ────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="hub-card p-4 text-center col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center gap-1.5">
            <GiTwoCoins className="h-5 w-5 text-[#F4D06F]" />
            <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">
              {wallet?.balance.toLocaleString() ?? "—"}
            </p>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Balance</p>
        </div>
        {[
          {
            label: "In Play",
            value:
              bets.filter((b) => b.status === "accepted").length +
              myWagers.filter((w) => w.status === "pending").length,
          },
          { label: "Won", value: totalWon, prefix: "+" },
          { label: "Lost", value: totalLost, prefix: "-" },
        ].map((s) => (
          <div key={s.label} className="hub-card p-4 text-center">
            <p className="text-xl font-black text-gray-900 dark:text-zinc-100">
              {s.prefix ?? ""}
              {s.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Tab bar + New Bet ─────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {(["active", "book", "h2h", "season", "standings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 sm:px-4 py-1.5 text-xs font-semibold transition ${
                tab === t
                  ? "bg-[#F4D06F]/15 text-[#F4D06F] border border-[#F4D06F]/30"
                  : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 border border-transparent"
              }`}
            >
              {t === "active"
                ? "Active"
                : t === "book"
                ? "The Book"
                : t === "h2h"
                ? "H2H"
                : t === "season"
                ? "Season"
                : "Standings"}
            </button>
          ))}
        </div>
        {(tab === "active" || tab === "season" || tab === "h2h") && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
          >
            <FiPlus className="h-3 w-3" />
            New Bet
          </button>
        )}
      </div>

      {tab === "active" && (
        <ActiveSection
          myWagers={myWagers}
          wagersLoading={wagersLoading}
          futuresData={futuresData}
          bets={bets}
          currentProfileId={currentProfileId}
          isOwner={isOwner}
          onAccept={handleAccept}
          onSettle={setSettleBet}
        />
      )}

      {tab === "book" && (
        <div className="space-y-4">
          <FuturesSection
            data={futuresData}
            loading={futuresLoading}
            balance={wallet?.balance ?? null}
            hubLeagueId={hubLeagueId}
            onPlaced={handleFuturePlaced}
          />
          <BookSection
            book={book}
            loading={bookLoading}
            currentProfileId={currentProfileId}
            balance={wallet?.balance ?? null}
            onPlaced={handleWagerPlaced}
          />
        </div>
      )}

      {tab === "standings" && (
        <StandingsSection
          standings={standings}
          loading={standingsLoading}
          currentProfileId={currentProfileId}
        />
      )}

      {(tab === "season" || tab === "h2h") && (
        <>
      {/* ─── Open Bets ─────────────────────────────── */}
      {openBets.length > 0 && (
        <section className="mb-4 hub-card p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Open Bets
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
              Waiting for an opponent
            </p>
          </div>
          <ul className="space-y-2">
            {openBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentProfileId={currentProfileId}
                isOwner={isOwner}
                onAccept={handleAccept}
                onSettle={setSettleBet}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ─── Active Bets ───────────────────────────── */}
      <section className="mb-4 hub-card p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Active Bets</h2>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
            Accepted and in play
          </p>
        </div>
        {activeBets.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
            No active bets yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentProfileId={currentProfileId}
                isOwner={isOwner}
                onAccept={handleAccept}
                onSettle={setSettleBet}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ─── Settled Bets ──────────────────────────── */}
      <section className="hub-card p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Settled</h2>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
            Completed wagers
          </p>
        </div>
        {settledBets.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
            No settled bets yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {settledBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentProfileId={currentProfileId}
                isOwner={isOwner}
                onAccept={handleAccept}
                onSettle={setSettleBet}
              />
            ))}
          </ul>
        )}
      </section>
        </>
      )}
    </>
  );
}
