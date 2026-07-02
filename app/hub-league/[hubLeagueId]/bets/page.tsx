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
} from "react-icons/fi";
import { GiTwoCoins } from "react-icons/gi";

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
  title: string;
  description: string | null;
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

// ─── Create Bet Modal ────────────────────────────────────────────────────
function CreateBetModal({
  hubLeagueId,
  onClose,
  onCreated,
}: {
  hubLeagueId: string;
  onClose: () => void;
  onCreated: (bet: Bet) => void;
}) {
  const [type, setType] = useState<"season" | "h2h">("season");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [week, setWeek] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
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
          amount: parsedAmount,
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
          Propose a wager — another member can accept the other side.
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

            {type === "season" ? (
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
            ) : (
              <div className="w-28">
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
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim() || !amount}
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
          {bet.creator.username} vs {bet.taker?.username} — {bet.amount.toLocaleString()} coins each
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
            Push (Refund Both)
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
        <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-800 dark:text-zinc-200">
          <GiTwoCoins className="h-3.5 w-3.5 text-[#F4D06F]" />
          {bet.amount.toLocaleString()}
        </span>
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

// ─── Main Page ───────────────────────────────────────────────────────────
export default function BetsPage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const [loading, setLoading] = useState(true);
  const [hubLeague, setHubLeague] = useState<{ name: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<number | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"season" | "h2h">("season");
  const [showCreate, setShowCreate] = useState(false);
  const [settleBet, setSettleBet] = useState<Bet | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!hubLeagueId) return;
    try {
      const [leagueRes, walletRes, betsRes] = await Promise.all([
        fetch(`/api/hub-leagues/${hubLeagueId}`),
        fetch(`/api/hub-leagues/${hubLeagueId}/wallet`),
        fetch(`/api/hub-leagues/${hubLeagueId}/bets`),
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
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [hubLeagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            label: "Active",
            value: bets.filter((b) => b.status === "open" || b.status === "accepted").length,
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(["season", "h2h"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                tab === t
                  ? "bg-[#F4D06F]/15 text-[#F4D06F] border border-[#F4D06F]/30"
                  : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 border border-transparent"
              }`}
            >
              {t === "season" ? "Season" : "H2H"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
        >
          <FiPlus className="h-3 w-3" />
          New Bet
        </button>
      </div>

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
  );
}
