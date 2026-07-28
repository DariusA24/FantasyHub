"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowRight, FiCheck, FiSearch, FiX } from "react-icons/fi";
import {
  getGuestSleeper,
  loadSleeperLeagues,
  resolveSleeperUser,
  setGuestSleeper,
  type GuestSleeper,
} from "@/lib/guestSleeper";

function avatarUrl(avatar?: string | null) {
  return avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;
}

// Landing-page widget: import a Sleeper account by username so the guest tools
// (Trade Analyzer, Waiver Wire, Power Rankings) can use it without signing in.
export default function GuestSleeperImport() {
  const [account, setAccount] = useState<GuestSleeper | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAccount(getGuestSleeper());
  }, []);

  const connect = async () => {
    const u = username.trim();
    if (!u || loading) return;
    setLoading(true);
    setError("");
    try {
      const resolved = await resolveSleeperUser(u);
      if (!resolved) {
        setError("Sleeper username not found");
        return;
      }
      const leagues = await loadSleeperLeagues(resolved.userId);
      if (leagues.length === 0) {
        setError("No recent leagues found for that account");
        return;
      }
      setGuestSleeper(resolved);
      setAccount(resolved);
      setUsername("");
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setGuestSleeper(null);
    setAccount(null);
    setError("");
  };

  const img = account ? avatarUrl(account.avatar) : null;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-sm dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
      {account ? (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-emerald-500">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-full w-full object-cover" />
            ) : (
              <FiCheck className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500">
              Sleeper connected
            </p>
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {account.displayName || account.username}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link
              href="/tools/trade-analyzer"
              className="inline-flex items-center gap-1 rounded-full bg-[#F4D06F] px-3 py-1.5 text-[11px] font-bold text-zinc-950 transition hover:bg-[#f7e07a]"
            >
              Open tools <FiArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={disconnect}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <FiX className="h-2.5 w-2.5" /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Import your Sleeper account
          </p>
          <div className="flex items-center gap-2">
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              placeholder="your_sleeper_username"
              spellCheck={false}
              autoCapitalize="none"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
            />
            <button
              onClick={connect}
              disabled={loading || !username.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#F4D06F] px-3 py-2 text-xs font-bold text-zinc-950 transition hover:bg-[#f7e07a] disabled:opacity-40"
            >
              {loading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-900/40 border-t-zinc-900" />
              ) : (
                <FiSearch className="h-3 w-3" />
              )}
              {loading ? "Loading…" : "Import"}
            </button>
          </div>
          {error ? (
            <p className="mt-1.5 text-[10px] text-red-500">{error}</p>
          ) : (
            <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-600">
              Use the tools with your real leagues — no sign-in needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
