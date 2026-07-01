'use client';

import React, { useState } from 'react';
import Modal from './modal';
import SleeperConfirmModal from './SleeperConfirmModal';
import { searchSleeperProfile, linkSleeperProfileToUser } from '@/utils/sleeperActions';
import { FiSearch, FiX } from 'react-icons/fi';

type SleeperSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function SleeperSearchModal({ isOpen, onClose }: SleeperSearchModalProps) {
  const [sleeperProfile, setSleeperProfile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundSleeperProfile, setFoundSleeperProfile] = useState<any | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleSearchSleeperProfile = async () => {
    if (!sleeperProfile.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await searchSleeperProfile(sleeperProfile.trim());
      setFoundSleeperProfile(result);
    } catch (err) {
      setFoundSleeperProfile(null);
      setSearchError(
        err instanceof Error ? err.message : 'Could not find that Sleeper profile. Check the username and try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmProfile = async () => {
    if (!foundSleeperProfile) return;
    try {
      setIsLinking(true);
      await linkSleeperProfileToUser(foundSleeperProfile);
      setSleeperProfile('');
      setFoundSleeperProfile(null);
      setSearchError(null);
      onClose();
    } finally {
      setIsLinking(false);
    }
  };

  const handleRejectProfile = () => {
    setFoundSleeperProfile(null);
    setSearchError(null);
  };

  if (!isOpen) return null;

  if (foundSleeperProfile) {
    return (
      <SleeperConfirmModal
        profile={foundSleeperProfile}
        onConfirm={handleConfirmProfile}
        onReject={handleRejectProfile}
        isProcessing={isLinking}
      />
    );
  }

  return (
    <Modal onClose={isSearching ? () => {} : onClose}>
      <div className="w-[90vw] max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-6 shadow-xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-md">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Sleeper
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Link your Sleeper account
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Enter your Sleeper username to connect your leagues.
            </p>
          </div>
          {!isSearching && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>

        {isSearching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <span className="h-9 w-9 rounded-full border-[3px] border-zinc-200 dark:border-zinc-800 border-t-amber-500 dark:border-t-[#F4D06F] animate-spin" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Searching Sleeper…</p>
          </div>
        ) : (
          <>
            {/* Input */}
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Sleeper username or ID"
                value={sleeperProfile}
                onChange={(e) => setSleeperProfile(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSleeperProfile()}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/60 py-2.5 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>

            {searchError && (
              <p className="mb-3 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {searchError}
              </p>
            )}

            <button
              onClick={handleSearchSleeperProfile}
              disabled={!sleeperProfile.trim()}
              className="w-full rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-amber-600 dark:hover:bg-[#f7da8b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

export default SleeperSearchModal;
