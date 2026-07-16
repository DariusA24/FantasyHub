'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FiChevronDown,
  FiTool,
  FiRepeat,
  FiTarget,
  FiBarChart2,
  FiUsers,
  FiZap,
  FiCalendar,
} from 'react-icons/fi';

export const TOOLS = [
  {
    href: '/tools/trade-analyzer',
    label: 'Trade Analyzer',
    description: 'Evaluate any trade before you pull the trigger',
    icon: FiRepeat,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    href: '/tools/waiver-wire',
    label: 'Waiver Wire',
    description: 'Find the best available pickups this week',
    icon: FiZap,
    color: 'text-[#F4D06F]',
    bg: 'bg-[#F4D06F]/10',
  },
  {
    href: '/tools/matchup-breakdown',
    label: 'Start/Sit Optimizer',
    description: 'Adjust your lineup to ensure you win',
    icon: FiUsers,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    href: '/tools/power-rankings',
    label: 'Power Rankings',
    description: 'See where every team stands right now',
    icon: FiBarChart2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    href: null,
    label: 'Lineup Optimizer',
    description: 'Set the optimal lineup based on projections',
    icon: FiTarget,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    soon: true,
  },
  {
    href: '/tools/scouting',
    label: 'Scouting',
    description: 'Rank dynasty prospects by draft class',
    icon: FiCalendar,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
];

export default function ToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
      >
        <FiTool className="h-3.5 w-3.5" />
        <span className="tracking-[0.18em]">TOOLS</span>
        <FiChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-2 z-50">
          <p className="px-3 pt-1.5 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">
            Available Tools
          </p>
          <ul className="space-y-0.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              if (tool.soon) {
                return (
                  <li key={tool.label}>
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-50 cursor-not-allowed">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.bg}`}>
                        <Icon className={`h-4 w-4 ${tool.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{tool.label}</p>
                          <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 border border-zinc-300 dark:border-zinc-700 rounded-full px-1.5 py-0.5">Soon</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">{tool.description}</p>
                      </div>
                    </div>
                  </li>
                );
              }
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href!}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.bg}`}>
                      <Icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white">{tool.label}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{tool.description}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}