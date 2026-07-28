"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

export default function EspnSeasonPicker({
  current,
  seasons,
}: {
  current: string;
  seasons: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Always include the season being viewed, even if ESPN didn't list it
  const options = Array.from(new Set([current, ...seasons])).sort((a, b) => Number(b) - Number(a));
  if (options.length <= 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <FiCalendar className="h-3 w-3" /> {current}
      </span>
    );
  }

  return (
    <div className="relative">
      <FiCalendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
      <select
        value={current}
        onChange={(e) => router.push(`${pathname}?season=${e.target.value}`)}
        className="appearance-none rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 pl-7 pr-7 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 outline-none focus:border-red-500/50 transition cursor-pointer"
        aria-label="Season"
      >
        {options.map((s) => (
          <option key={s} value={s}>{s} Season</option>
        ))}
      </select>
      <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
    </div>
  );
}
