'use client';

import { useState } from 'react';
import { FiAward, FiChevronDown } from 'react-icons/fi';

export type TrophyAward = {
  id: string;
  label: string;
  description: string | null;
  value: string | null;
  season: string;
  week: number | null;
  leagueName: string;
};

export default function TrophyCase({ awards }: { awards: TrophyAward[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {awards.map((a) => {
        const expanded = expandedId === a.id;
        return (
          <li key={a.id} className={expanded ? 'sm:col-span-2' : ''}>
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : a.id)}
              aria-expanded={expanded}
              className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                expanded
                  ? 'border-amber-400/40 bg-amber-500/5 dark:bg-[#F4D06F]/5'
                  : 'border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-[#F4D06F]/10">
                <FiAward className="h-4 w-4 text-amber-600 dark:text-[#F4D06F]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.label}</p>
                  {a.value && (
                    <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-[#F4D06F]">
                      {a.value}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className={`text-[11px] text-zinc-500 ${expanded ? 'whitespace-pre-line' : 'truncate'}`}>
                    {a.description}
                  </p>
                )}
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                  {a.leagueName} · {a.season}{a.week != null ? ` · Week ${a.week}` : ''}
                </p>
              </div>
              <FiChevronDown
                className={`shrink-0 mt-1 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
