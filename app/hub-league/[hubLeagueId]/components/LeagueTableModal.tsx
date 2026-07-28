"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { PowerRankingTeam } from "./types";

type Props = {
  title: string;
  icon: IconType;
  accent: string;
  /** Teams in the order they should be displayed (position = index + 1). */
  teams: PowerRankingTeam[];
  onClose: () => void;
};

export function LeagueTableModal({ title, icon: Icon, accent, teams, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: accent }} />
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {teams.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 italic">No teams available yet.</p>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-2 px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                <span className="w-5 shrink-0 text-center">#</span>
                <span className="flex-1">Team</span>
                <span className="w-14 text-right">Record</span>
                <span className="w-16 text-right">PF</span>
              </div>
              <ul className="space-y-1">
                {teams.map((team, i) => {
                  const position = i + 1;
                  const record =
                    team.ties > 0
                      ? `${team.wins}-${team.losses}-${team.ties}`
                      : `${team.wins}-${team.losses}`;
                  return (
                    <li
                      key={`${team.displayName}-${team.rank}`}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                        team.isMe
                          ? "border border-[#F4D06F]/20 bg-[#F4D06F]/5"
                          : "border border-transparent"
                      }`}
                    >
                      <span
                        className={`w-5 shrink-0 text-center text-xs font-bold ${
                          position === 1 ? "text-[#F4D06F]" : "text-zinc-500"
                        }`}
                      >
                        {position}
                      </span>
                      <p
                        className={`flex-1 truncate text-sm font-medium ${
                          team.isMe ? "text-[#F4D06F]" : "text-zinc-200"
                        }`}
                      >
                        {team.displayName}
                      </p>
                      <span className="w-14 text-right text-xs text-zinc-400">{record}</span>
                      <span className="w-16 text-right text-xs text-zinc-500">
                        {team.pointsFor.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
