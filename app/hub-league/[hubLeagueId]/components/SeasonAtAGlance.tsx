"use client";

import { FiCalendar, FiChevronRight } from "react-icons/fi";
import type { SeasonGlance } from "./types";

type Props = {
  loaded: boolean;
  seasonGlance?: SeasonGlance;
  onViewFull?: () => void;
};

function ordinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export function SeasonAtAGlance({ loaded, seasonGlance, onViewFull }: Props) {
  const wins = seasonGlance?.wins ?? 0;
  const losses = seasonGlance?.losses ?? 0;
  const ties = seasonGlance?.ties ?? 0;
  const rank = seasonGlance?.rank ?? 0;
  const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
  const suffix = ordinalSuffix(rank);

  return (
    <section className="hub-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <FiCalendar className="h-3.5 w-3.5 text-[var(--gold)]" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-2)]">
          Season at a Glance
        </h2>
      </div>

      {!loaded ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-24 rounded-lg bg-[var(--card-2)]" />
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--card-2)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-[var(--ink)]">{record}</span>
            {rank > 0 && (
              <span className="mb-1 text-sm font-semibold text-[var(--gold)]">
                {rank}{suffix} place
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "PF",     value: (seasonGlance?.pointsFor ?? 0).toFixed(2) },
              { label: "PA",     value: (seasonGlance?.pointsAgainst ?? 0).toFixed(2) },
              { label: "Streak", value: seasonGlance?.streak ?? "—" },
              { label: "Rank",   value: rank > 0 ? `${rank}${suffix}` : "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[var(--card-2)]/60 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">
                  {item.label}
                </p>
                <p className="text-xs font-bold text-[var(--ink)]">{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {onViewFull && (
        <button
          onClick={onViewFull}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line-2)] py-2 text-[11px] text-[var(--ink-3)] hover:border-[var(--field)]/50 hover:text-[var(--ink-2)] transition"
        >
          Full Standings <FiChevronRight className="h-3 w-3" />
        </button>
      )}
    </section>
  );
}
