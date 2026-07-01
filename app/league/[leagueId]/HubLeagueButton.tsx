'use client';

import { useState } from 'react';
import { LeagueHubModal } from '@/components/ui/LeagueHubModal';
import { FiGrid } from 'react-icons/fi';

import type { SleeperLeague } from '@/utils/hubActions';

type Props = {
  league: SleeperLeague;
};

export default function HubLeagueButton({ league }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-[#F4D06F] transition-colors"
      >
        <FiGrid className="h-3.5 w-3.5" />
        Hub Leagues
      </button>

      <LeagueHubModal
        league={league}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
