"use client";

import { useState } from "react";
import { FiSearch } from "react-icons/fi";

// Inline toolbar control for guests to connect a Sleeper account (or change the
// one already imported on the landing page). Shared by the guest tools.
export default function GuestSleeperConnect({
  connectedName,
  onConnect,
  onDisconnect,
}: {
  connectedName: string | null;
  onConnect: (username: string) => Promise<string | null>;
  onDisconnect: () => void;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const u = username.trim();
    if (!u || loading) return;
    setLoading(true);
    setError("");
    const err = await onConnect(u);
    setLoading(false);
    if (err) setError(err);
    else setUsername("");
  };

  if (connectedName) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Sleeper account
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {connectedName}
          </span>
          <button
            onClick={onDisconnect}
            className="text-[10px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Sleeper Username
      </span>
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="your_sleeper_name"
          spellCheck={false}
          autoCapitalize="none"
          className="w-44 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
        />
        <button
          onClick={submit}
          disabled={loading || !username.trim()}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 disabled:opacity-40 dark:hover:border-zinc-700"
        >
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-500 dark:border-zinc-700" />
          ) : (
            <FiSearch className="h-3 w-3" />
          )}
          {loading ? "Loading…" : "Load"}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
