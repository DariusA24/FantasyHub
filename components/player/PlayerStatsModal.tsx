import React, { useEffect, useState } from "react";
import type { SleeperPlayer } from "@/app/hub-league/[hubLeagueId]/roster/page";
import { getSleeperPlayersProfilePicture } from "@/utils/sleeperActions";

// Simple modal for viewing a player's stats
export function PlayerStatsModal({
  open,
  player,
  onClose,
}: {
  open: boolean;
  player: SleeperPlayer | null;
  onClose: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  useEffect(() => {
    if (!open || !player?.player_id) {
      setAvatarUrl(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingAvatar(true);
        // Fix: pass a single playerId and expect a string | null
        const url = await getSleeperPlayersProfilePicture(player.player_id);
        if (!cancelled) {
          setAvatarUrl(url);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch player profile picture:", e);
          setAvatarUrl(null);
        }
      } finally {
        if (!cancelled) setLoadingAvatar(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, player?.player_id]);

  if (!open || !player) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-[#050609] border border-zinc-800 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
              {loadingAvatar ? (
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={player.full_name ?? player.player_id}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-zinc-500">No photo</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {player.full_name ?? player.player_id}
              </h2>
              <p className="text-xs text-zinc-400">
                {player.position && (
                  <span className="mr-2 font-semibold text-zinc-200">
                    {player.position}
                  </span>
                )}
                {player.team && <span>{player.team}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        {/* Placeholder stats content – replace with real API data later */}
        <div className="mt-2 space-y-2 text-sm text-zinc-300">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Player Stats (placeholder)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-900/60 rounded-lg p-3">
            <div>
              <p className="text-zinc-500">Games</p>
              <p className="font-semibold text-zinc-100">–</p>
            </div>
            <div>
              <p className="text-zinc-500">Fantasy Pts</p>
              <p className="font-semibold text-zinc-100">–</p>
            </div>
            <div>
              <p className="text-zinc-500">Yards</p>
              <p className="font-semibold text-zinc-100">–</p>
            </div>
            <div>
              <p className="text-zinc-500">TDs</p>
              <p className="font-semibold text-zinc-100">–</p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Hook this modal up to your stats API (e.g. Sleeper weekly stats) and
            display real numbers by season/week.
          </p>
        </div>
      </div>
    </div>
  );
}