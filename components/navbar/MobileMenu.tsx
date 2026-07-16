'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX, FiHome, FiGrid } from 'react-icons/fi';
import { TOOLS } from './ToolsDropdown';
import { COMMUNITY_LINKS } from './CommunityDropdown';
import NavSearch from './NavSearch';

const MAIN_LINKS = [
  { href: '/', label: 'Home', icon: FiHome },
  { href: '/manager', label: 'Manager', icon: FiGrid },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close when navigating to a new page
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex items-center justify-center rounded-full p-2 text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
      >
        {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-xs rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0a0c14]/95 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-2 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="px-2 pt-2 pb-3">
            <NavSearch />
          </div>

          <ul className="space-y-0.5">
            {MAIN_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Icon className="h-4 w-4 text-amber-500 dark:text-[#F4D06F]" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{item.label}</p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="px-3 pt-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">
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
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                      <Icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{item.label}</p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="px-3 pt-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">
            Tools
          </p>
          <ul className="space-y-0.5">
            {TOOLS.filter((t) => !t.soon && t.href).map((tool) => {
              const Icon = tool.icon;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href!}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.bg}`}>
                      <Icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{tool.label}</p>
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
