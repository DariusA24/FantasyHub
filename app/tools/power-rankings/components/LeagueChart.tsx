"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import type { TeamData } from "../types";

const RANK_BAR: Record<number, string> = {
  1: "bg-amber-400/80",
  2: "bg-zinc-300/40",
  3: "bg-orange-600/50",
};

const RANK_LABEL_CLASS: Record<number, string> = {
  1: "text-amber-500 dark:text-amber-400",
  2: "text-zinc-500 dark:text-zinc-300",
  3: "text-orange-500",
};

const RANK_DOT: Record<number, string> = {
  1: "#F59E0B",
  2: "#A1A1AA",
  3: "#EA580C",
};

const RANK_LABEL_HEX: Record<number, string> = {
  1: "#F59E0B",
  2: "#D4D4D8",
  3: "#EA580C",
};

// ─── Dotted line SVG chart ────────────────────────────────────────────────────
function LineChart({ teams, isDark }: { teams: TeamData[]; isDark: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (teams.length === 0) return null;

  const svgColors = {
    guideLine:     isDark ? "#27272a" : "#e4e4e7",
    axisLabel:     isDark ? "#52525b" : "#71717a",
    valueLabel:    isDark ? "#a1a1aa" : "#71717a",
    genericName:   isDark ? "#71717a" : "#52525b",
    hoveredName:   isDark ? "#e4e4e7" : "#18181b",
    tooltipBg:     isDark ? "#18181b" : "#f4f4f5",
    tooltipBorder: isDark ? "#3f3f46" : "#d4d4d8",
    tooltipText:   isDark ? "#e4e4e7" : "#18181b",
  };

  const MIN_SPACING = 58;
  const W      = Math.max(500, teams.length * MIN_SPACING + 56);
  const H      = 220;
  const padX   = 28;
  const padTop = 28;
  const padBot = 44;
  const plotW  = W - padX * 2;
  const plotH  = H - padTop - padBot;

  const maxVal  = teams[0].totalValue;
  const minVal  = teams[teams.length - 1].totalValue;
  const valSpan = maxVal - minVal || 1;

  const pts = teams.map((t, i) => ({
    x: teams.length === 1 ? padX + plotW / 2 : padX + (i / (teams.length - 1)) * plotW,
    y: padTop + (1 - (t.totalValue - minVal) / valSpan) * plotH,
    team: t,
  }));

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y   = padTop + frac * plotH;
        const val = Math.round(maxVal - frac * valSpan);
        return (
          <g key={frac}>
            <line x1={padX} y1={y} x2={W - padX} y2={y}
              stroke={svgColors.guideLine} strokeWidth="1" />
            <text x={padX - 4} y={y + 4} textAnchor="end"
              fontSize="9" fill={svgColors.axisLabel}>
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
            </text>
          </g>
        );
      })}

      <path d={pathD} fill="none" stroke="#F59E0B" strokeWidth="1.5"
        strokeDasharray="4 3" strokeLinecap="round" opacity="0.5" />

      {pts.map((p) => {
        const rank      = p.team.overallRank;
        const dotColor  = RANK_DOT[rank] ?? "#52525b";
        const lblHex    = RANK_LABEL_HEX[rank] ?? svgColors.genericName;
        const isHovered = hovered === p.team.rosterId;
        const shortName = p.team.displayName.split(" ")[0].slice(0, 8);
        const fullName  = p.team.displayName;
        const tipW      = Math.max(fullName.length * 6.5 + 16, 60);
        const tipH      = 20;
        const tipX      = Math.min(Math.max(p.x - tipW / 2, padX), W - padX - tipW);
        const tipY      = p.y - tipH - 10;

        return (
          <g key={p.team.rosterId}
            onMouseEnter={() => setHovered(p.team.rosterId)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default" }}
          >
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <text x={p.x} y={p.y - 10} textAnchor="middle"
              fontSize="9" fill={svgColors.valueLabel} fontWeight="600">
              {p.team.totalValue >= 1000
                ? `${(p.team.totalValue / 1000).toFixed(1)}k`
                : p.team.totalValue}
            </text>
            <circle cx={p.x} cy={p.y} r={isHovered ? 6 : rank <= 3 ? 5 : 4}
              fill={isHovered ? "#F59E0B" : dotColor}
              opacity={rank <= 3 || isHovered ? 1 : 0.6}
            />
            {rank <= 3 && (
              <text x={p.x} y={p.y + 3.5} textAnchor="middle"
                fontSize="6" fill="#000" fontWeight="800">
                {rank}
              </text>
            )}
            <text x={p.x} y={H - padBot + 14} textAnchor="middle"
              fontSize="9" fill={isHovered ? svgColors.hoveredName : lblHex}
              fontWeight={rank <= 3 || isHovered ? "700" : "400"}>
              {shortName}
            </text>
            {isHovered && (
              <g>
                <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="5"
                  fill={svgColors.tooltipBg} stroke={svgColors.tooltipBorder} strokeWidth="1" />
                <text x={tipX + tipW / 2} y={tipY + 13} textAnchor="middle"
                  fontSize="10" fill={svgColors.tooltipText} fontWeight="600">
                  {fullName}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LeagueChart({ teams }: { teams: TeamData[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const maxVal = teams[0]?.totalValue ?? 1;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
          League Power Chart
        </h2>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-600">Cumulative roster value</span>
      </div>

      <div className="flex divide-x divide-zinc-200 dark:divide-zinc-800/40">
        <div className="w-[42%] shrink-0 px-4 py-4 flex flex-col gap-2">
          {teams.map((team) => {
            const pct      = Math.round((team.totalValue / maxVal) * 100);
            const barColor = RANK_BAR[team.overallRank] ?? "bg-zinc-400/40 dark:bg-zinc-700/40";
            const lblColor = RANK_LABEL_CLASS[team.overallRank] ?? "text-zinc-500 dark:text-zinc-600";
            return (
              <div key={team.rosterId} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold w-5 text-right shrink-0 ${lblColor}`}>
                  #{team.overallRank}
                </span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 w-24 shrink-0 truncate">
                  {team.displayName}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800/60 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 w-12 text-right shrink-0 tabular-nums">
                  {team.totalValue.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 overflow-x-auto px-4 py-4">
          <LineChart teams={teams} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}
