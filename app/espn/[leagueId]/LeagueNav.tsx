"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { FiHome, FiCalendar, FiUsers } from "react-icons/fi";

export function EspnLeagueNav() {
  const params = useParams();
  const pathname = usePathname();
  const leagueId = String(params?.leagueId ?? "");

  const items = [
    { href: `/espn/${leagueId}`,          label: "Overview",  icon: FiHome },
    { href: `/espn/${leagueId}/schedule`, label: "Schedule",  icon: FiCalendar },
    { href: `/espn/${leagueId}/rosters`,  label: "Rosters",   icon: FiUsers },
  ];

  return (
    <nav className="mb-6 border-b border-gray-200 dark:border-zinc-800 pb-2">
      <ul className="ml-auto flex justify-end gap-4 text-sm">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  "px-2 py-1 rounded inline-flex items-center gap-1 " +
                  (isActive
                    ? "text-[#F4D06F] border-b-2 border-[#F4D06F]"
                    : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200")
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
