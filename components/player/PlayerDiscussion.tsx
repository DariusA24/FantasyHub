"use client";

import { useEffect, useRef, useState } from "react";
import { FiSend, FiActivity, FiEdit3, FiTrash2, FiX, FiCheck } from "react-icons/fi";

type Author = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};

const POLL_INTERVAL = 5000;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ author }: { author: Author }) {
  if (author.profileImage) {
    return (
      <img
        src={author.profileImage}
        alt={author.username}
        className="h-6 w-6 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-[9px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
      {author.firstName[0]?.toUpperCase()}
    </div>
  );
}

// ─── Single message row with edit / delete ────────────────────────────────────

function MessageRow({
  msg,
  isOwn,
  playerId,
  onDeleted,
  onEdited,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  playerId: string;
  onDeleted: (id: string) => void;
  onEdited: (updated: ChatMessage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function saveEdit() {
    if (!editVal.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${playerId}/chat/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editVal.trim() }),
      });
      const d = await res.json();
      if (res.ok && d.message) {
        onEdited(d.message);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteMsg() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/players/${playerId}/chat/${msg.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(msg.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group flex gap-2">
      <Avatar author={msg.author} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            {msg.author.firstName} {msg.author.lastName}
          </span>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-600">{timeAgo(msg.createdAt)}</span>

          {/* Own-message actions */}
          {isOwn && !editing && (
            <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {confirmDel ? (
                <>
                  <span className="text-[9px] text-zinc-500">Delete?</span>
                  <button
                    onClick={deleteMsg}
                    disabled={deleting}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    {deleting ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="rounded px-1.5 py-0.5 text-[9px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEditing(true); setEditVal(msg.body); }}
                    className="rounded p-0.5 text-zinc-500 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-[#F4D06F] transition"
                    title="Edit"
                  >
                    <FiEdit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setConfirmDel(true)}
                    className="rounded p-0.5 text-zinc-500 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition"
                    title="Delete"
                  >
                    <FiTrash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </span>
          )}
        </div>

        {editing ? (
          <div className="flex gap-1.5 mt-0.5">
            <input
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              maxLength={500}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20"
            />
            <button
              onClick={saveEdit}
              disabled={!editVal.trim() || saving}
              className="rounded-lg p-1.5 bg-amber-500 dark:bg-[#F4D06F] text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40"
            >
              <FiCheck className="h-3 w-3" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
            >
              <FiX className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed break-words">{msg.body}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerDiscussion({
  playerId,
  height = 320,
}: {
  playerId: string;
  height?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!playerId) return;
    setLoaded(false);
    setMessages([]);
    latestRef.current = null;

    fetch(`/api/players/${playerId}/chat`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) {
          setMessages(d.messages);
          if (d.messages.length > 0) {
            latestRef.current = d.messages[d.messages.length - 1].createdAt;
          }
        }
        if (d.currentProfileId) setCurrentProfileId(d.currentProfileId);
      })
      .catch(() => setOnline(false))
      .finally(() => setLoaded(true));
  }, [playerId]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!playerId) return;
    const id = setInterval(async () => {
      try {
        const since = latestRef.current;
        const url = since
          ? `/api/players/${playerId}/chat?since=${encodeURIComponent(since)}`
          : `/api/players/${playerId}/chat`;
        const r = await fetch(url);
        const d = await r.json();
        if (d.currentProfileId && !currentProfileId) setCurrentProfileId(d.currentProfileId);
        if (d.messages && d.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = (d.messages as ChatMessage[]).filter((m) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            latestRef.current = fresh[fresh.length - 1].createdAt;
            return [...prev, ...fresh];
          });
          setOnline(true);
        }
      } catch {
        setOnline(false);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [playerId, currentProfileId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/players/${playerId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      });
      const d = await res.json();
      if (res.ok && d.message) {
        setMessages((prev) => {
          latestRef.current = d.message.createdAt;
          return [...prev, d.message];
        });
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 flex flex-col overflow-hidden"
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <FiActivity className="h-3.5 w-3.5 text-amber-600 dark:text-[#F4D06F]" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Live Discussion</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online
                ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]"
                : "bg-zinc-400 dark:bg-zinc-600"
            }`}
          />
          <span
            className={`text-[9px] font-semibold uppercase tracking-widest ${
              online ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-600"
            }`}
          >
            {online ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {!loaded ? (
          <div className="space-y-2.5 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800/60 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-20 rounded bg-zinc-200 dark:bg-zinc-800/60" />
                  <div className="h-2.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800/40" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FiActivity className="h-5 w-5 text-zinc-400 dark:text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">No messages yet.</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">Start the discussion!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              isOwn={msg.author.id === currentProfileId}
              playerId={playerId}
              onDeleted={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
              onEdited={(updated) =>
                setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
              }
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex gap-2 px-3 py-2.5 border-t border-zinc-200 dark:border-zinc-800/60 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Say something…"
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-2.5 py-1.5 text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiSend className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
