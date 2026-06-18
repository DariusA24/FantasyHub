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

const TOOLS = [
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
    href: '/tools/lineup-optimizer',
    label: 'Lineup Optimizer',
    description: 'Set the optimal lineup based on projections',
    icon: FiTarget,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
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
    href: '/tools/draft-board',
    label: 'Draft Board',
    description: 'Prep your rankings before draft day',
    icon: FiCalendar,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    href: '/tools/matchup-breakdown',
    label: 'Matchup Breakdown',
    description: 'Deep dive into any head-to-head matchup',
    icon: FiUsers,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
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
        className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-amber-50/80 hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/40 transition-all duration-150"
      >
        <FiTool className="h-3.5 w-3.5" />
        <span className="tracking-[0.18em]">TOOLS</span>
        <FiChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-zinc-800/80 bg-[#0a0c14]/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-2 z-50">
          <p className="px-3 pt-1.5 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Available Tools
          </p>
          <ul className="space-y-0.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.bg}`}>
                      <Icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100 group-hover:text-white">{tool.label}</p>
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