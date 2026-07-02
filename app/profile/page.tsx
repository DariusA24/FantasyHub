'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import FormContainer from '@/components/form/FormContainer';
import { updateProfileAction, updateProfileImageAction } from '@/utils/actions';
import { SubmitButton } from '@/components/form/Buttons';
import { getSleeperUserById } from '@/utils/sleeperService';
import { FiUser, FiCamera, FiLink, FiCheckCircle } from 'react-icons/fi';
import EspnPanel from '@/components/espn/EspnPanel';

type EspnLeague = { id: string; leagueId: string; season: string; name: string | null; teamCount: number | null };

type UserProfile = {
  id: number;
  clerkId: string;
  sleeperProfileId: string | null;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
  hasEspnCredentials?: boolean;
  espnLeagues?: EspnLeague[];
};

const inputCls =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20 transition';

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  accent = 'amber',
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: 'amber' | 'emerald' | 'sky';
}) {
  const accentMap = {
    amber: { bg: 'bg-amber-500/10 dark:bg-[#F4D06F]/10', icon: 'text-amber-600 dark:text-[#F4D06F]' },
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
    sky: { bg: 'bg-sky-500/10', icon: 'text-sky-600 dark:text-sky-400' },
  };
  const colors = accentMap[accent];

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] shadow-sm dark:shadow-none overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="text-[11px] text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sleeperUsername, setSleeperUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setUserProfile(d.profile ?? null))
      .catch(() => setUserProfile(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userProfile?.sleeperProfileId) { setSleeperUsername(''); return; }
    getSleeperUserById(userProfile.sleeperProfileId)
      .then((u) => setSleeperUsername(typeof u === 'string' ? u : u?.username ?? ''))
      .catch(() => setSleeperUsername(''));
  }, [userProfile?.sleeperProfileId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] px-4 pt-10 pb-24">
        <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded-xl bg-zinc-200 dark:bg-zinc-800/50" />
          <div className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800/40" />
          <div className="h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800/30" />
          <div className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800/30" />
        </div>
      </div>
    );
  }

  const profileImageUrl = userProfile?.profileImage || '/default-profile.png';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-10">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
            Account
          </div>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
              <Image
                src={profileImageUrl}
                alt="Your profile"
                width={56}
                height={56}
                className="relative h-14 w-14 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName ?? ''}`.trim() : 'Your Profile'}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {userProfile?.username ? `@${userProfile.username}` : 'Update your account settings below'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">

          {/* ─── Profile Photo ─────────────────────────────── */}
          <SectionCard icon={FiCamera} title="Profile Photo" description="Upload a new avatar" accent="amber">
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={profileImageUrl}
                alt="Current photo"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Current photo</p>
                <button
                  type="button"
                  onClick={() => setPhotoExpanded((v) => !v)}
                  className="mt-1 text-xs text-amber-600 dark:text-[#F4D06F] hover:underline"
                >
                  {photoExpanded ? 'Cancel' : 'Change photo'}
                </button>
              </div>
            </div>
            {photoExpanded && (
              <FormContainer action={updateProfileImageAction}>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Upload Image
                    </label>
                    <input
                      id="image"
                      name="image"
                      type="file"
                      required
                      accept="image/*"
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-600 dark:file:text-[#F4D06F] hover:file:bg-amber-500/20 transition"
                    />
                  </div>
                  <SubmitButton text="Upload Photo" className="w-full" size="sm" />
                </div>
              </FormContainer>
            )}
          </SectionCard>

          {/* ─── Personal Info ─────────────────────────────── */}
          <SectionCard icon={FiUser} title="Personal Info" description="Your name and username" accent="sky">
            <FormContainer action={updateProfileAction}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      defaultValue={userProfile?.firstName ?? ''}
                      placeholder="First name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      defaultValue={userProfile?.lastName ?? ''}
                      placeholder="Last name"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-600 select-none">@</span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      defaultValue={userProfile?.username ?? ''}
                      placeholder="username"
                      className={`${inputCls} pl-7`}
                    />
                  </div>
                </div>
                {/* Hidden sleeperId so the action doesn't blank it out */}
                <input type="hidden" name="sleeperId" value={sleeperUsername} />
                <SubmitButton text="Save Changes" className="w-full" size="default" />
              </div>
            </FormContainer>
          </SectionCard>

          {/* ─── Sleeper Connection ─────────────────────────── */}
          <SectionCard icon={FiLink} title="Sleeper Account" description="Link your Sleeper username to sync leagues" accent="emerald">
            <FormContainer action={updateProfileAction}>
              <div className="space-y-4">
                {sleeperUsername && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Connected</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">@{sleeperUsername}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor="sleeperId" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Sleeper Username
                  </label>
                  <input
                    id="sleeperId"
                    name="sleeperId"
                    type="text"
                    defaultValue={sleeperUsername}
                    placeholder="e.g. fantasyboss42"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-600">
                    Enter your Sleeper username (not display name) to sync your leagues.
                  </p>
                </div>
                {/* Pass through other fields unchanged */}
                <input type="hidden" name="firstName" value={userProfile?.firstName ?? ''} />
                <input type="hidden" name="lastName" value={userProfile?.lastName ?? ''} />
                <input type="hidden" name="username" value={userProfile?.username ?? ''} />
                <SubmitButton text="Update Sleeper" className="w-full" size="default" />
              </div>
            </FormContainer>
          </SectionCard>

          {/* ─── ESPN Leagues — hidden for MVP ─────────────── */}
          {/* <EspnPanel
            initial={userProfile?.espnLeagues ?? []}
            hasCredentials={userProfile?.hasEspnCredentials ?? false}
          /> */}

        </div>
      </div>
    </div>
  );
}
