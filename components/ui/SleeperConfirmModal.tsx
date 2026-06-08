'use client';

import React from 'react';
import Modal from './modal';

type SleeperConfirmModalProps = {
  profile: any; // you can replace with a proper type later
  onConfirm: () => void;
  onReject: () => void;
  isProcessing?: boolean;
};

function SleeperConfirmModal({
  profile,
  onConfirm,
  onReject,
  isProcessing = false,
}: SleeperConfirmModalProps) {
  return (
    <Modal onClose={isProcessing ? () => {} : onReject}>
      <div className="bg-zinc-900 text-zinc-300 p-6 rounded-lg shadow-lg border-2 border-emerald-700 relative min-w-[320px] max-w-md">
        {!isProcessing && (
          <button
            type="button"
            className="absolute right-3 top-3 text-zinc-400 hover:text-white"
            onClick={onReject}
          >
            ✕
          </button>
        )}

        <h2 className="text-xl font-bold mb-4 text-emerald-300">
          Is this your Sleeper profile?
        </h2>

        <div className="mb-4 space-y-1 text-sm">
          <p>
            <span className="font-semibold text-zinc-100">Display Name:</span>{' '}
            {profile.display_name ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold text-zinc-100">Username:</span>{' '}
            {profile.username ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold text-zinc-100">User ID:</span>{' '}
            {profile.user_id ?? 'N/A'}
          </p>
          {/* Add any other fields you care about later */}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="btn flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Linking...' : 'Yes, this is me'}
          </button>
          <button
            type="button"
            className="btn flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            onClick={onReject}
            disabled={isProcessing}
          >
            No, go back
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SleeperConfirmModal;
