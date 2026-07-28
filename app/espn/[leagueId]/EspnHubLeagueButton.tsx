'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HubLeague,
  fetchHubLeaguesForEspnLeague,
  createHubLeagueForEspnLeague,
  triggerComputeAllAwards,
} from "@/utils/hubActions";
import { FiGrid, FiX, FiUser, FiCalendar, FiExternalLink } from "react-icons/fi";

type Props = {
  leagueId: string;
  leagueName: string;
  season: string;
  sport?: string;
};

// Create / open the ONE canonical public hub league backed by this ESPN league.
export default function EspnHubLeagueButton({ leagueId, leagueName, season, sport = "nfl" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hub, setHub] = useState<HubLeague | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    fetchHubLeaguesForEspnLeague(leagueId)
      .then((hubs) => setHub(hubs[0] ?? null))
      .catch((e: any) => setError(e?.message ?? "Failed to load hub leagues"))
      .finally(() => setLoading(false));
  }, [open, leagueId]);

  const openHub = (id: string, name: string) => {
    setNavigating(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("recentHubLeague", JSON.stringify({ id, name }));
    }
    router.push(`/hub-league/${id}`);
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createHubLeagueForEspnLeague({ leagueId, name: leagueName, season, sport });
      triggerComputeAllAwards(created.id);
      openHub(created.id, created.name);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create hub league");
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-[#F4D06F] transition-colors"
      >
        <FiGrid className="h-3.5 w-3.5" />
        Hub League
      </button>

      {open && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm px-8 py-8 ${navigating ? "cursor-wait" : ""}`}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d0f1a] border border-zinc-200 dark:border-zinc-800/80 shadow-xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden">

            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{leagueName}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Season {season} · <span className="uppercase">ESPN</span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <FiGrid className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Hub League</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Every ESPN league gets one public hub league — blog, franchise history, and league management, browsable by anyone.
                </p>

                {error && <p className="text-xs text-red-500 dark:text-red-400 break-words mb-3">{error}</p>}

                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 dark:border-t-[#F4D06F] animate-spin" />
                    Loading…
                  </div>
                ) : hub ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{hub.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {hub.ownerUsername && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <FiUser className="h-2.5 w-2.5" />
                            {hub.ownerUsername}
                          </span>
                        )}
                        {hub.createdAt && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <FiCalendar className="h-2.5 w-2.5" />
                            {new Date(hub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={navigating}
                      onClick={() => openHub(hub.id, hub.name)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 dark:bg-[#F4D06F] text-white dark:text-zinc-950 disabled:opacity-50 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition-colors"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" />
                      {navigating ? "Opening…" : "Open"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full text-xs px-2.5 py-2 rounded-lg bg-amber-500 dark:bg-[#F4D06F] text-white dark:text-zinc-950 font-medium disabled:opacity-50 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition-colors"
                  >
                    {creating ? "Creating…" : "Create Hub League"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
