"use client";

import { useState } from "react";
import { FiX, FiSend } from "react-icons/fi";
import type { BlogPostTag } from "./LeagueBlog";

const TAGS: BlogPostTag[] = ["Recap", "Trade", "Power Rankings", "Trash Talk", "Injury", "News"];

const TAG_STYLE: Record<BlogPostTag, string> = {
  Recap:            "border-blue-500/40 bg-blue-500/10 text-blue-400",
  Trade:            "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  "Power Rankings": "border-[#F4D06F]/40 bg-[#F4D06F]/10 text-[#F4D06F]",
  "Trash Talk":     "border-red-500/40 bg-red-500/10 text-red-400",
  Injury:           "border-orange-500/40 bg-orange-500/10 text-orange-400",
  News:             "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};

type Props = {
  hubLeagueId: string;
  onClose: () => void;
  onCreated: () => void;
};

export function NewPostModal({ hubLeagueId, onClose, onCreated }: Props) {
  const [tag, setTag] = useState<BlogPostTag>("Recap");
  const [weekLabel, setWeekLabel] = useState("Week 1");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, weekLabel, title, body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to publish post.");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-100">New Post</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Tag + Week row */}
            <div className="flex gap-3">
              {/* Tag selector */}
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Tag
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                        tag === t
                          ? TAG_STYLE[t]
                          : "border-zinc-700/50 bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week label */}
              <div className="w-36 shrink-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Week / Period
                </label>
                <input
                  type="text"
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  placeholder="Week 1"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a headline..."
                maxLength={120}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20"
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your post here..."
                rows={10}
                className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20 leading-relaxed"
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">
                {body.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiSend className="h-3.5 w-3.5" />
              {submitting ? "Publishing…" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
