import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // NEW: router import
import {
  HubLeague,
  SleeperLeague,
  fetchHubLeaguesForSleeperLeague,
  createHubLeagueForSleeperLeague,
  joinHubLeague,
} from "@/utils/hubActions"; // NEW

type LeagueHubModalProps = {
  league: SleeperLeague | null;
  isOpen: boolean;
  onClose: () => void;
};

export function LeagueHubModal({ league, isOpen, onClose }: LeagueHubModalProps) {
  const router = useRouter(); // NEW: init router
  const [hubLeagues, setHubLeagues] = useState<HubLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null); // NEW

  useEffect(() => {
    if (!isOpen || !league) return;

    setCreateSuccess(false);
    setCreateError(false);
    setCreateErrorMessage(null);
    setJoiningId(null);

    const loadHubLeagues = async () => {
      setLoading(true);
      try {
        const normalized = await fetchHubLeaguesForSleeperLeague(league.league_id);
        setHubLeagues(normalized);
      } catch (e: any) {
        console.error("Error loading hub leagues:", e);
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
    } catch (err: any) {
      console.error("Error creating hub league:", err);
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
      // Mark as member locally
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg rounded-2xl bg-[#050711] border border-[#1d212b] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[#F4D06F]">
            {league.name}
          </h3>
          <div className="flex items-center gap-2">
            {createSuccess && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 text-emerald-300 px-2 py-0.5 text-[11px]">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
                Created
              </span>
            )}
            {createError && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 text-red-300 px-2 py-0.5 text-[11px]">
                <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
                Failed
              </span>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {createErrorMessage && (
          <p className="mb-2 text-xs text-red-300 break-words">
            {createErrorMessage}
          </p>
        )}

        <p className="text-sm text-zinc-400 mb-4">
          Season{" "}
          <span className="font-medium text-zinc-200">{league.season}</span>{" "}
          ·{" "}
          <span className="uppercase text-xs text-zinc-500">
            {league.sport}
          </span>
        </p>

        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-200">
              Hub Leagues for this team
            </h4>
            <button
              className="text-xs px-2 py-1 rounded-md bg-[#F4D06F] text-black font-medium disabled:opacity-60"
              onClick={handleCreateHubLeague}
              disabled={creating || alreadyHasHubLeague}
            >
              {creating ? "Creating..." : alreadyHasHubLeague ? "Already created" : "New Hub League"}
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-zinc-400">Loading hub leagues…</p>
          ) : hubLeagues.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No hub leagues yet for this Sleeper league (league_id:{" "}
              <span className="font-mono">{league.league_id}</span>). Create one to
              start a blog, history, and more.
            </p>
          ) : (
            <ul className="space-y-2">
              {hubLeagues.map((hub) => (
                <li
                  key={hub.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {hub.name}
                    </p>
                    {hub.ownerUsername && (
                      <p className="text-[11px] text-zinc-500">
                        Owner: <span className="font-medium">{hub.ownerUsername}</span>
                      </p>
                    )}
                    {hub.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {hub.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hub.isMember ? (
                      <button
                        className="text-xs text-[#F4D06F]"
                        onClick={() => {
                          router.push(`/hub-league/${hub.id}`);
                        }}
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                        onClick={() => handleJoinHubLeague(hub.id)}
                        disabled={joiningId === hub.id}
                      >
                        {joiningId === hub.id ? "Joining..." : "Join"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
