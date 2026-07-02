'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiUsers, FiMessageSquare, FiShoppingBag } from 'react-icons/fi';

const COMMUNITY_LINKS = [
  {
    href: '/forum',
    label: 'Forum',
    description: 'Fantasy football talk, all in one place',
    icon: FiMessageSquare,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
  {
    href: '/league-market',
    label: 'League Market',
    description: 'Find an open spot or hand off your team',
    icon: FiShoppingBag,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

export default function CommunityDropdown() {
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
        <FiUsers className="h-3.5 w-3.5" />
        <span className="tracking-[0.18em]">COMMUNITY</span>
        <FiChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-2 z-50">
          <p className="px-3 pt-1.5 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">
            Community
          </p>
          <ul className="space-y-0.5">
            {COMMUNITY_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                      <Icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white">{item.label}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{item.description}</p>
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
