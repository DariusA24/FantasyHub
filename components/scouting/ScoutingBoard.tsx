"use client";

import { useEffect, useRef, useState } from "react";
import { FiLock, FiGlobe, FiEdit3, FiTrash2, FiX, FiCheck, FiFileText } from "react-icons/fi";
import { HiLockClosed, HiGlobeAlt } from "react-icons/hi";

// ─── Types ────────────────────────────────────────────────────────────────────

type Author = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
};

type ScoutingNote = {
  id: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  author: Author;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ author }: { author: Author }) {
  if (author.profileImage) {
    return (
      <img
        src={author.profileImage}
        alt={author.username}
        className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-800"
      />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
      {author.firstName[0]?.toUpperCase()}
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  isOwn,
  athleteId,
  onDeleted,
  onUpdated,
}: {
  note: ScoutingNote;
  isOwn: boolean;
  athleteId: string;
  onDeleted: (id: string) => void;
  onUpdated: (updated: ScoutingNote) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(note.body);
  const [editPublic, setEditPublic] = useState(note.isPublic);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wasEdited = note.updatedAt !== note.createdAt;

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editBody.length, editBody.length);
    }
  }, [editing]);

  async function saveEdit() {
    if (!editBody.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${athleteId}/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim(), isPublic: editPublic }),
      });
      const d = await res.json();
      if (res.ok && d.note) {
        onUpdated(d.note);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/prospects/${athleteId}/notes/${note.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(note.id);
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      note.isPublic
        ? "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20"
        : "border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/[0.04] dark:border-amber-500/15"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-2.5 mb-3">
        <Avatar author={note.author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">
              {note.author.firstName} {note.author.lastName}
            </span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-600">@{note.author.username}</span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-600">·</span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-600">{timeAgo(note.createdAt)}</span>
            {wasEdited && <span className="text-[9px] text-zinc-400 dark:text-zinc-600 italic">· edited</span>}
          </div>
        </div>

        {/* Visibility badge + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-[9px] font-bold ${
            note.isPublic
              ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}>
            {note.isPublic
              ? <HiGlobeAlt className="h-2.5 w-2.5" />
              : <HiLockClosed className="h-2.5 w-2.5" />}
            {note.isPublic ? "Public" : "Private"}
          </span>

          {isOwn && !editing && (
            <>
              <button
                onClick={() => { setEditing(true); setEditBody(note.body); setEditPublic(note.isPublic); }}
                className="rounded-md p-1 text-zinc-400 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-[#F4D06F] hover:bg-amber-500/10 transition-colors"
                title="Edit note"
              >
                <FiEdit3 className="h-3 w-3" />
              </button>
              {confirmDel ? (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-zinc-500">Delete?</span>
                  <button
                    onClick={deleteNote}
                    disabled={deleting}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    {deleting ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="rounded px-1.5 py-0.5 text-[9px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="rounded-md p-1 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete note"
                >
                  <FiTrash2 className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="space-y-2.5">
          <textarea
            ref={textareaRef}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            maxLength={2000}
            rows={5}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2.5 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between gap-3">
            {/* Visibility toggle */}
            <button
              type="button"
              onClick={() => setEditPublic((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                editPublic
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {editPublic ? <FiGlobe className="h-3 w-3" /> : <FiLock className="h-3 w-3" />}
              {editPublic ? "Public" : "Private"}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editBody.trim() || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-3 py-1.5 text-[11px] font-bold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40"
              >
                <FiCheck className="h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {note.body}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Filter = "all" | "public" | "private";

export function ScoutingBoard({ athleteId, playerName }: { athleteId: string; playerName: string }) {
  const [notes, setNotes] = useState<ScoutingNote[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch(`/api/prospects/${athleteId}/notes`)
      .then((r) => {
        if (r.status === 401) { setAuthError(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setNotes(d.notes ?? []);
        setCurrentProfileId(d.currentProfileId ?? null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [athleteId]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/prospects/${athleteId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), isPublic }),
      });
      const d = await res.json();
      if (res.ok && d.note) {
        setNotes((prev) => [d.note, ...prev]);
        setBody("");
        setCharCount(0);
      }
    } finally {
      setSending(false);
    }
  }

  const ownNoteCount = notes.filter((n) => n.author.id === currentProfileId).length;
  const publicCount  = notes.filter((n) => n.isPublic).length;
  const privateCount = notes.filter((n) => !n.isPublic && n.author.id === currentProfileId).length;

  const displayed = notes.filter((n) => {
    if (filter === "public")  return n.isPublic;
    if (filter === "private") return !n.isPublic && n.author.id === currentProfileId;
    return true;
  });

  return (
    <div className="space-y-4">

      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FiFileText className="h-4 w-4 text-amber-500 dark:text-[#F4D06F]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">Scouting Board</p>
          {loaded && notes.length > 0 && (
            <span className="rounded-full bg-zinc-200 dark:bg-zinc-800/80 px-1.5 py-px text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
              {notes.length}
            </span>
          )}
        </div>

        {/* Filter pills */}
        {loaded && notes.length > 0 && (
          <div className="flex gap-1">
            {(["all", "public", "private"] as Filter[]).map((f) => {
              const count = f === "all" ? notes.length : f === "public" ? publicCount : privateCount;
              if (f === "private" && privateCount === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all capitalize ${
                    filter === f
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-[#F4D06F]"
                      : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-400"
                  }`}
                >
                  {f} {count > 0 && <span className="opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose form */}
      {authError ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 px-4 py-5 text-center">
          <FiLock className="h-5 w-5 text-zinc-300 dark:text-zinc-700 mx-auto mb-1.5" />
          <p className="text-[12px] text-zinc-500 dark:text-zinc-600">Sign in to write scouting notes</p>
        </div>
      ) : (
        <form onSubmit={submitNote} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 p-4 space-y-3">
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setCharCount(e.target.value.length); }}
              maxLength={2000}
              rows={4}
              placeholder={`Write your scouting report on ${playerName}…\n\nCover route running, ball skills, athleticism, dynasty outlook, or anything you want to track.`}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50/60 dark:bg-zinc-900/40 px-3.5 py-3 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:bg-white dark:focus:bg-zinc-900/60 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20 resize-none leading-relaxed transition-colors"
            />
            {charCount > 0 && (
              <span className={`absolute bottom-2 right-2.5 text-[9px] tabular-nums ${charCount > 1800 ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}`}>
                {charCount}/2000
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Visibility toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                  isPublic
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                }`}
              >
                {isPublic ? <FiGlobe className="h-3 w-3" /> : <FiLock className="h-3 w-3" />}
                {isPublic ? "Public" : "Private"}
              </button>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                {isPublic ? "Visible to all scouts" : "Only visible to you"}
              </p>
            </div>

            <button
              type="submit"
              disabled={!body.trim() || sending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-[12px] font-bold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "Filing…" : "File Report"}
            </button>
          </div>
        </form>
      )}

      {/* Notes list */}
      {!loaded ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800/60 shrink-0" />
                <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800/50" />
              </div>
              <div className="space-y-1.5 pl-9">
                <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800/40" />
                <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800/30" />
                <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800/20" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/10">
          <FiFileText className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
          <p className="text-[12px] text-zinc-500 dark:text-zinc-600">
            {filter === "private"
              ? "No private notes yet."
              : `No scouting reports filed for ${playerName} yet. Be the first.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOwn={note.author.id === currentProfileId}
              athleteId={athleteId}
              onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              onUpdated={(updated) => setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))}
            />
          ))}
        </div>
      )}

      {/* Own note summary */}
      {loaded && ownNoteCount > 0 && (
        <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-700 pb-1">
          You have {ownNoteCount} report{ownNoteCount > 1 ? "s" : ""} on this prospect
          {privateCount > 0 ? ` · ${privateCount} private` : ""}
        </p>
      )}
    </div>
  );
}
