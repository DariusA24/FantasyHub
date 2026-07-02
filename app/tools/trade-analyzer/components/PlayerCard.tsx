"use client";

import { useState } from "react";
import Image from "next/image";
import { FiX, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import type { SelectedPlayer } from "../types";
import { POSITION_COLOR, TIER_COLOR } from "../constants";

export function PlayerCard({ player, isDynasty, onRemove }: {
  player: SelectedPlayer;
  isDynasty: boolean;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const isPick    = player.position === "PICK";
  const posClass  = POSITION_COLOR[player.position] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
  const tierClass = player.tier ? (TIER_COLOR[player.tier] ?? TIER_COLOR[5]) : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 px-3 py-2.5 group">
      <div className="h-9 w-9 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 shrink-0">
        {!isPick && !imgError ? (
          <Image
            src={`https://sleepercdn.com/content/nfl/players/thumb/${player.sleeperId}.jpg`}
            alt={player.name} width={36} height={36}
            className="object-cover object-top w-full h-full"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
            {isPick ? "PK" : player.position}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{player.name}</p>
          {tierClass && (
            <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-bold ${tierClass}`}>
              T{player.tier}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${posClass}`}>
            {player.position}
          </span>
          {!isPick && <span className="text-[10px] text-zinc-500 dark:text-zinc-600">{player.team || "FA"}</span>}
          {player.age !== null && !isPick && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-600">· Age {Math.floor(player.age)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{player.value.toLocaleString()}</p>
          {isDynasty && player.redraftValue > 0 && !isPick && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-600">RD {player.redraftValue.toLocaleString()}</p>
          )}
          {player.trend !== 0 && (
            <div className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${
              player.trend > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              {player.trend > 0
                ? <FiTrendingUp className="h-2.5 w-2.5" />
                : <FiTrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(player.trend)}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
