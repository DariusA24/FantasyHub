'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HubLeague,
  SleeperLeague,
  fetchHubLeaguesForSleeperLeague,
  createHubLeagueForSleeperLeague,
  joinHubLeague,
  triggerComputeAllAwards,
} from "@/utils/hubActions";
import { FiX, FiGlobe, FiLock, FiExternalLink, FiCalendar, FiUser } from "react-icons/fi";

type LeagueHubModalProps = {
  league: SleeperLeague | null;
  isOpen: boolean;
  onClose: () => void;
};

export function LeagueHubModal({ league, isOpen, onClose }: LeagueHubModalProps) {
  const router = useRouter();
  const [hubLeagues, setHubLeagues] = useState<HubLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !league) return;
    setCreateSuccess(false);
    setCreateError(false);
    setCreateErrorMessage(null);
    setJoiningId(null);

    const loadHubLeagues = async () => {
      setLoading(true);
      try {
        const normalized = await fetchHubLeaguesForSleeperLeague(league.league_id, league.previous_league_id);
        setHubLeagues(normalized);
      } catch (e: any) {
        setCreateError(true);
        setCreateErrorMessage(e?.message ?? "Error loading hub leagues");
      } finally {
        setLoading(false);
      }
    };

    loadHubLeagues();
  }, [isOpen, league]);

  const handleCreateHubLeague = async () => {
    if (!league || creating) return;
    setCreating(true);
    setCreateSuccess(false);
    setCreateError(false);
    setCreateErrorMessage(null);
    try {
      const created = await createHubLeagueForSleeperLeague(league);
      setHubLeagues((prev) => {
        const exists = prev.some((h) => h.id === created.id);
        return exists ? prev : [...prev, created];
      });
      setCreateSuccess(true);
      triggerComputeAllAwards(created.id);
    } catch (err: any) {
      setCreateError(true);
      setCreateErrorMessage(err?.message ?? "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinHubLeague = async (hubId: string) => {
    if (joiningId) return;
    setJoiningId(hubId);
    setCreateError(false);
    setCreateErrorMessage(null);
    try {
      await joinHubLeague(hubId);
      setHubLeagues((prev) =>
        prev.map((h) => (h.id === hubId ? { ...h, isMember: true } : h))
      );
    } catch (e: any) {
      setCreateError(true);
      setCreateErrorMessage(e?.message ?? "Unknown error joining hub league");
    } finally {
      setJoiningId(null);
    }
  };

  if (!isOpen || !league) return null;

  const alreadyHasHubLeague = hubLeagues.length > 0;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm px-8 py-8 ${navigatingId ? "cursor-wait" : ""}`}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d0f1a] border border-zinc-200 dark:border-zinc-800/80 shadow-xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {league.name}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Season {league.season} · <span className="uppercase">{league.sport}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ── Public League ─────────────────────── */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/40 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <FiGlobe className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Public League</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Standings, records, and matchup history sourced directly from Sleeper. Visible to anyone.
            </p>
            <button
              onClick={() => { onClose(); router.push(`/league/${league.league_id}`); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <FiExternalLink className="h-3.5 w-3.5" />
              Open Public League
            </button>
          </div>

          {/* ── Divider ───────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              <FiLock className="h-3 w-3" />
              Private
            </div>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* ── Hub Leagues ───────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Hub Leagues</span>
              <button
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 dark:bg-[#F4D06F] text-white dark:text-zinc-950 font-medium disabled:opacity-50 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition-colors"
                onClick={handleCreateHubLeague}
                disabled={creating}
              >
                {creating ? "Creating…" : "New Hub League"}
              </button>
            </div>

            {createSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Hub league created!</p>
            )}
            {createErrorMessage && (
              <p className="text-xs text-red-500 dark:text-red-400 break-words">{createErrorMessage}</p>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-amber-500 dark:border-t-[#F4D06F] animate-spin" />
                Loading…
              </div>
            ) : hubLeagues.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No hub leagues yet. Create one to unlock posts, history, and league management.
              </p>
            ) : (
              <ul className="space-y-2">
                {hubLeagues.map((hub) => {
                  const isLocked = !hub.isMember && !hub.isOwner;
                  const createdDate = hub.createdAt
                    ? new Date(hub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : null;
                  return (
                    <li
                      key={hub.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                        isLocked
                          ? "border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/30 opacity-70"
                          : "border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isLocked && <FiLock className="h-3 w-3 text-zinc-400 dark:text-zinc-600 shrink-0" />}
                          <p className={`text-sm font-medium truncate ${isLocked ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>{hub.name}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {hub.ownerUsername && (
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <FiUser className="h-2.5 w-2.5" />
                              {hub.ownerUsername}
                            </span>
                          )}
                          {createdDate && (
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <FiCalendar className="h-2.5 w-2.5" />
                              {createdDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isLocked ? (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed">
                            Locked
                          </span>
                        ) : hub.isMember ? (
                          <button
                            disabled={navigatingId === hub.id}
                            className="text-xs font-medium text-amber-600 dark:text-[#F4D06F] disabled:opacity-50"
                            onClick={async () => {
                              setNavigatingId(hub.id);
                              try { await createHubLeagueForSleeperLeague(league); } catch {}
                              if (typeof window !== "undefined") {
                                localStorage.setItem("recentHubLeague", JSON.stringify({ id: hub.id, name: hub.name }));
                              }
                              router.push(`/hub-league/${hub.id}`);
                            }}
                          >
                            {navigatingId === hub.id ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-3 rounded-full border-2 border-[#F4D06F]/40 border-t-[#F4D06F] animate-spin" />
                                Opening…
                              </span>
                            ) : "Open"}
                          </button>
                        ) : (
                          <button
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                            onClick={() => handleJoinHubLeague(hub.id)}
                            disabled={joiningId === hub.id}
                          >
                            {joiningId === hub.id ? "Joining…" : "Join"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
