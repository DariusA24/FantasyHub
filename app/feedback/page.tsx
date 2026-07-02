'use client';

import { useState } from 'react';
import { FiAlertCircle, FiZap, FiSend, FiCheckCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

type FeedbackType = 'bug' | 'suggestion';

export default function FeedbackPage() {
  const router = useRouter();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, body }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <FiCheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Thanks for the feedback!</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
            {type === 'bug'
              ? "We'll look into the issue and get it fixed."
              : "We'll review your suggestion — great ideas make FantasyHub better."}
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-full px-6 py-2 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors shadow-md shadow-amber-500/20"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">

        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
            Help Us Improve
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-[#F4D06F] dark:via-[#f9f0c2] dark:to-[#F4D06F] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Share Feedback
          </h1>
          <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
            Found a bug? Have an idea? We want to hear it.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 p-8 shadow-sm dark:shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Type toggle */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 mb-3">
                What kind of feedback?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    type === 'bug'
                      ? 'border-red-400/60 bg-red-500/10 text-red-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <FiAlertCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Bug Report</p>
                    <p className="text-[10px] opacity-70">Something is broken</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType('suggestion')}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    type === 'suggestion'
                      ? 'border-amber-400/60 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <FiZap className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Suggestion</p>
                    <p className="text-[10px] opacity-70">I have an idea</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder={type === 'bug' ? 'e.g. Trade analyzer crashes on mobile' : 'e.g. Add ESPN league support'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 mb-2">
                Details
              </label>
              <textarea
                required
                maxLength={1000}
                rows={5}
                placeholder={
                  type === 'bug'
                    ? 'Describe what happened, what you expected, and steps to reproduce...'
                    : 'Describe your idea and why it would help...'
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition"
              />
              <p className="mt-1 text-right text-[10px] text-zinc-400">{body.length}/1000</p>
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
