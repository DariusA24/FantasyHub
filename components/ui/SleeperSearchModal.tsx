'use client';

import React, { useState } from 'react';
import Modal from './modal';
import SleeperConfirmModal from './SleeperConfirmModal';
import { searchSleeperProfile, linkSleeperProfileToUser } from '@/utils/sleeperActions'; // server action

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
      // action returns the user object directly
      setFoundSleeperProfile(result);
      console.log('Found Sleeper Profile:', result);
      // do NOT close yet – let user confirm
    } catch (err) {
      setFoundSleeperProfile(null);
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Could not find Sleeper profile. Please check the username/ID.'
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

      // Reset local state so the modal is clean the next time it opens
      setSleeperProfile('');
      setFoundSleeperProfile(null);
      setSearchError(null);

      // This will close the modal in the parent (HomePage)
      onClose(); // parent will refetch and keep it closed
    } finally {
      setIsLinking(false);
    }
  };

  const handleRejectProfile = () => {
    // Clear and let user search again
    setFoundSleeperProfile(null);
    setSearchError(null);
  };

  if (!isOpen) return null;

  // When we have a found profile, show the confirm modal instead of the search UI
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
      <div className="bg-zinc-900 text-zinc-300 p-6 rounded-lg shadow-lg border-2 border-blue-800 relative min-h-[160px] flex items-center justify-center">
        {!isSearching && (
          <button
            type="button"
            className="absolute right-3 top-3 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        )}

        {isSearching ? (
          <div className="flex flex-col items-center justify-center gap-3">
            {/* Tailwind spinner */}
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-full border-4 border-zinc-600 border-t-amber-400 animate-spin"
            />
            <p className="text-sm text-zinc-300">Searching Sleeper profile...</p>
          </div>
        ) : (
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-amber-300">Set Sleeper Profile</h2>
            <input
              type="text"
              placeholder="Enter Sleeper username or ID"
              className="input input-bordered w-full mb-2 bg-zinc-800 text-white placeholder-gray-400"
              value={sleeperProfile}
              onChange={(e) => setSleeperProfile(e.target.value)}
              disabled={isSearching}
            />
            {searchError && (
              <p className="text-sm text-red-500 mb-2">
                {searchError || 'Unable to find sleeper profile.'}
              </p>
            )}

            <button
              className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={handleSearchSleeperProfile}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default SleeperSearchModal;
