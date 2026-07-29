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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-bright)]/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            <p className="text-xs font-medium text-[var(--gold)]">
              Demo mode — preview with mock data. No account needed.
            </p>
          </div>
          <SignUpButton>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-[var(--field)] px-4 py-1.5 text-[11px] font-bold text-[#f7f4ec] transition hover:bg-[var(--field-2)]">
              Create your hub free
              <FiArrowRight className="h-3 w-3" />
            </button>
          </SignUpButton>
        </div>
      )}
    <nav className="mb-6 border-b border-[var(--line)] pb-2">
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
                    ? "text-[var(--field-2)] font-semibold border-b-2 border-[var(--field)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]")
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
