'use client';

import React from 'react';
import Modal from './modal';
import Image from 'next/image';
import { FiCheck, FiX } from 'react-icons/fi';

type SleeperConfirmModalProps = {
  profile: any;
  onConfirm: () => void;
  onReject: () => void;
  isProcessing?: boolean;
};

function SleeperConfirmModal({ profile, onConfirm, onReject, isProcessing = false }: SleeperConfirmModalProps) {
  const avatarUrl = profile.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${profile.avatar}`
    : null;

  return (
    <Modal onClose={isProcessing ? () => {} : onReject}>
      <div className="w-[90vw] max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-6 shadow-xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-md">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Confirm Profile
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Is this you?
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Confirm this is your Sleeper account before linking.
            </p>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onReject}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Profile card */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3.5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.display_name ?? 'Sleeper avatar'}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4D06F]/10 border border-[#F4D06F]/20 text-xl font-bold text-amber-500 dark:text-[#F4D06F]">
              {(profile.display_name ?? profile.username ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {profile.display_name ?? profile.username ?? 'Unknown'}
            </p>
            {profile.username && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">@{profile.username}</p>
            )}
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
              ID: {profile.user_id}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f7da8b] disabled:opacity-60 transition-colors"
          >
            {isProcessing ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 dark:border-zinc-950/40 border-t-white dark:border-t-zinc-950 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <FiCheck className="h-3.5 w-3.5" />
                Yes, this is me
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isProcessing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/60 disabled:opacity-60 transition-colors"
          >
            <FiX className="h-3.5 w-3.5" />
            Not me
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SleeperConfirmModal;
