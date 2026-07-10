'use client';

import { useActionState, useEffect } from 'react';
import { createProfileAction } from '@/utils/actions';
import FormInput from '@/components/form/FormInput';
import { SubmitButton } from '@/components/form/Buttons';
import { FiUser } from 'react-icons/fi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const initialState = { message: '' };

export default function CreateProfilePage() {
  const router = useRouter();
  const [state, formAction] = useActionState(createProfileAction, initialState);

  useEffect(() => {
    if (!state.message) return;
    if (state.message === 'Profile created successfully!') {
      router.push('/');
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">

        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
            New Account
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4D06F]/10 ring-1 ring-[#F4D06F]/30">
              <FiUser className="h-7 w-7 text-amber-500 dark:text-[#F4D06F]" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-[#F4D06F] dark:via-[#f9f0c2] dark:to-[#F4D06F] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Set Up Your Profile
          </h1>
          <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
            Create your LeagueShelf identity to track leagues, wins, and more.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 p-8 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <form action={formAction}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <FormInput type="text" name="firstName" label="First Name" />
                <FormInput type="text" name="lastName" label="Last Name" />
              </div>
              <FormInput type="text" name="username" label="Username" />
            </div>
            <SubmitButton text="Create Profile" className="mt-8 w-full" size="lg" />
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-zinc-400 dark:text-zinc-600">
          You can link your Sleeper account after creating your profile.
        </p>

      </div>
    </div>
  );
}
