'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi';

type Props = {
  initialBio: string | null;
  initialProfileImage: string | null;
};

export default function EditProfilePanel({ initialBio, initialProfileImage }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio ?? '');
  const [photo, setPhoto] = useState(initialProfileImage ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, profileImage: photo }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setEditing(false);
      router.refresh();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-[#F4D06F] transition-colors"
      >
        <FiEdit2 className="h-3 w-3" />
        Edit Profile
      </button>
    );
  }

  return (
    <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800/60 pt-5 space-y-4 w-full">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5">Photo URL</label>
        <input
          type="url"
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
          placeholder="https://example.com/your-photo.jpg"
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition"
        />
        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">Paste a direct link to an image (JPG, PNG, etc.)</p>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Tell other managers about yourself…"
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
        />
        <p className="mt-0.5 text-right text-[10px] text-zinc-400 dark:text-zinc-600">{bio.length}/280</p>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 disabled:opacity-60 hover:bg-amber-600 dark:hover:bg-[#f7da8b] transition"
        >
          <FiCheck className="h-3 w-3" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700/60 px-4 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition disabled:opacity-60"
        >
          <FiX className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
