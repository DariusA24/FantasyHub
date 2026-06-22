"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";

export function LeagueNav() {
  const params = useParams();
  const pathname = usePathname();

  // use the param name that matches the folder: [hubLeagueId]
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const items = [
    { href: `/hub-league/${hubLeagueId}`, label: "Overview", icon: FiHome },
    { href: `/hub-league/${hubLeagueId}/roster`, label: "Roster", icon: FiUsers },
    { href: `/hub-league/${hubLeagueId}/franchise`, label: "My Franchise", icon: FiShield },
    { href: `/hub-league/${hubLeagueId}/bets`, label: "Bets", icon: FiTrendingUp },
  ];

  return (
    <nav className="mb-6 border-b border-zinc-800 pb-2">
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
                    : "text-zinc-400 hover:text-zinc-200")
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
