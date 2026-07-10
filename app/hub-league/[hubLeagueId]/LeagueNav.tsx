"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiShield,
  FiTrendingUp,
  FiArrowRight,
} from "react-icons/fi";
import { SignUpButton } from "@clerk/nextjs";

export function LeagueNav() {
  const params = useParams();
  const pathname = usePathname();

  // use the param name that matches the folder: [hubLeagueId]
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const items = [
    { href: `/hub-league/${hubLeagueId}`, label: "Overview", icon: FiHome },
    { href: `/hub-league/${hubLeagueId}/roster`, label: "Roster", icon: FiUsers },
    { href: `/hub-league/${hubLeagueId}/bets`, label: "Bets", icon: FiTrendingUp },
    { href: `/hub-league/${hubLeagueId}/franchise`, label: "Franchise", icon: FiShield },
  ];

  const isDemo = hubLeagueId === "demo";

  return (
    <>
      {isDemo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.8)]" />
            <p className="text-xs font-medium text-amber-700 dark:text-[#F4D06F]">
              Demo mode — preview with mock data. No account needed.
            </p>
          </div>
          <SignUpButton>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-[#F4D06F] px-4 py-1.5 text-[11px] font-bold text-zinc-950 shadow-[0_0_20px_rgba(244,208,111,0.3)] transition hover:bg-[#f7e07a]">
              Create your hub free
              <FiArrowRight className="h-3 w-3" />
            </button>
          </SignUpButton>
        </div>
      )}
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
    </>
  );
}
