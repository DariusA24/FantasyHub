"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { FiHome, FiUsers, FiShield } from "react-icons/fi";
import { GiTrophy } from "react-icons/gi";

export function LeagueNav() {
  const params = useParams();
  const pathname = usePathname();
  const leagueId = String(params?.leagueId ?? "");

  const items = [
    { href: `/league/${leagueId}`,            label: "Overview",     icon: FiHome },
    { href: `/league/${leagueId}/roster`,     label: "Roster",       icon: FiUsers },
    { href: `/league/${leagueId}/franchise`,  label: "Franchise",    icon: FiShield },
    { href: `/league/${leagueId}/trophy-room`, label: "Trophy Room", icon: GiTrophy },
  ];

  return (
    <nav className="mb-6 border-b border-gray-200 dark:border-zinc-800 pb-2">
      <ul className="ml-auto flex flex-nowrap overflow-x-auto justify-start gap-2 sm:justify-end sm:gap-4 text-sm">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  "px-2 py-1 rounded inline-flex items-center gap-1 whitespace-nowrap " +
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
