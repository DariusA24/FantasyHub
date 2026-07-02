"use client";

import { useState } from "react";
import Image from "next/image";
import { FiCheck } from "react-icons/fi";
import type { SelectedPlayer } from "../types";
import { POSITION_COLOR } from "../constants";

export function RosterCard({ player, selected, accent, onToggle }: {
  player: SelectedPlayer;
  selected: boolean;
  accent: "amber" | "blue";
  onToggle: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const isPick = player.position === "PICK";
  const posClass = POSITION_COLOR[player.position] ?? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/40";
  const selectedBorder = accent === "amber"
    ? "border-amber-500/50 bg-amber-500/5"
    : "border-blue-500/50 bg-blue-500/5";
  const checkBg = accent === "amber" ? "bg-amber-500 text-zinc-950" : "bg-blue-500 text-white";

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-100 ${
        selected ? selectedBorder : "border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
      }`}
    >
      <div className="h-8 w-8 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 shrink-0 relative">
        {!isPick && !imgError ? (
          <Image
            src={`https://sleepercdn.com/content/nfl/players/thumb/${player.sleeperId}.jpg`}
            alt={player.name} width={32} height={32}
            className="object-cover object-top w-full h-full"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-zinc-500">
            {isPick ? "PK" : (player.position || "?")}
          </div>
        )}
        {selected && (
          <div className={`absolute inset-0 flex items-center justify-center ${checkBg} opacity-80`}>
            <FiCheck className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold truncate ${selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
          {player.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`rounded-full border px-1.5 py-px text-[8px] font-semibold ${posClass}`}>
            {player.position}
          </span>
          {!isPick && player.team && (
            <span className="text-[9px] text-zinc-500 dark:text-zinc-600">{player.team}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-[11px] font-bold ${
          player.value > 0 ? (selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400") : "text-zinc-400 dark:text-zinc-700"
        }`}>
          {player.value > 0 ? player.value.toLocaleString() : "—"}
        </p>
      </div>
    </button>
  );
}
