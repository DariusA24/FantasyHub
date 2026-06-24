"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiEdit3, FiFileText, FiThumbsUp, FiThumbsDown, FiMessageSquare,
  FiX, FiSend, FiClock, FiTrash2, FiTrendingUp, FiZap, FiImage, FiLoader, FiUser,
} from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────

export type ForumTag =
  | "Trade Advice" | "Waiver Wire" | "Start/Sit" | "Draft"
  | "Trash Talk"   | "Playoffs"    | "News"       | "General";

const TAGS: ForumTag[] = ["Trade Advice", "Waiver Wire", "Start/Sit", "Draft", "Trash Talk", "Playoffs", "News", "General"];

const TAG_STYLE: Record<ForumTag, string> = {
  "Trade Advice": "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Waiver Wire":  "border-blue-500/40   bg-blue-500/10   text-blue-600 dark:text-blue-400",
  "Start/Sit":    "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Draft":        "border-amber-400/40  bg-amber-500/10  text-amber-600 dark:text-[#F4D06F]",
  "Trash Talk":   "border-red-500/40    bg-red-500/10    text-red-600 dark:text-red-400",
  "Playoffs":     "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "News":         "border-zinc-400/40   bg-zinc-500/10   text-zinc-600 dark:text-zinc-400",
  "General":      "border-sky-500/40    bg-sky-500/10    text-sky-600 dark:text-sky-400",
};

const TAG_DOT: Record<ForumTag, string> = {
  "Trade Advice": "bg-emerald-500 dark:bg-emerald-400",
  "Waiver Wire":  "bg-blue-500 dark:bg-blue-400",
  "Start/Sit":    "bg-purple-500 dark:bg-purple-400",
  "Draft":        "bg-amber-500 dark:bg-[#F4D06F]",
  "Trash Talk":   "bg-red-500 dark:bg-red-400",
  "Playoffs":     "bg-orange-500 dark:bg-orange-400",
  "News":         "bg-zinc-500 dark:bg-zinc-400",
  "General":      "bg-sky-500 dark:bg-sky-400",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Author = { id: number; firstName: string; lastName: string; username: string; profileImage: string };

type ForumPost = {
  id: string;
  tag: ForumTag;
  title: string;
  excerpt: string;
  readTime: string;
  mediaUrls: string[];
  publishedAt: string;
  author: Author;
  _count: { likes: number; dislikes: number; comments: number };
};

type ForumPostDetail = {
  id: string;
  tag: ForumTag;
  title: string;
  body: string;
  readTime: string;
  mediaUrls: string[];
  publishedAt: string;
  author: Author;
  likes: number;
  dislikes: number;
  myReaction: 1 | -1 | null;
  canDelete: boolean;
  canEdit: boolean;
  comments: { id: string; body: string; createdAt: string; author: Author }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ author, size = "sm" }: { author: Author; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-8 w-8 text-[11px]" : "h-5 w-5 text-[9px]";
  if (author.profileImage) {
    return <img src={author.profileImage} alt={author.username} className={`${cls} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold text-zinc-500 dark:text-zinc-400 shrink-0`}>
      {author.firstName[0]?.toUpperCase()}
    </div>
  );
}

// ─── Shared modal input classes ───────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20";

// ─── Shared Modal Shell ───────────────────────────────────────────────────────
function ModalShell({
  title, onClose, children, footer, zIndex = "z-50",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  zIndex?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl dark:shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5 flex-1">{children}</div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/60 shrink-0">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image compression ────────────────────────────────────────────────────────
const MAX_RAW_MB   = 20;
const MAX_DIM      = 1200;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<File> {
  // GIFs lose animation through canvas — send as-is
  if (file.type === "image/gif") return file;
  if (file.size > MAX_RAW_MB * 1024 * 1024) {
    throw new Error(`Image exceeds ${MAX_RAW_MB}MB limit`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else                { width  = Math.round((width  * MAX_DIM) / height); height = MAX_DIM; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });
}

// ─── Shared post form fields ──────────────────────────────────────────────────
function PostFormFields({
  tag, setTag, title, setTitle, body, setBody,
  mediaUrls, setMedia, uploading, setUploading, uploadErr, setUploadErr,
  error, fileRef,
}: {
  tag: ForumTag; setTag: (t: ForumTag) => void;
  title: string; setTitle: (v: string) => void;
  body: string; setBody: (v: string) => void;
  mediaUrls: string[]; setMedia: React.Dispatch<React.SetStateAction<string[]>>;
  uploading: boolean; setUploading: (v: boolean) => void;
  uploadErr: string | null; setUploadErr: (v: string | null) => void;
  error: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 4 - mediaUrls.length;
    if (remaining <= 0) return;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true); setUploadErr(null);
    try {
      const urls = await Promise.all(toUpload.map(async (file) => {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append("file", compressed);
        const res = await fetch("/api/forum/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        return data.url as string;
      }));
      setMedia((prev) => [...prev, ...urls]);
    } catch (e: any) {
      setUploadErr(e.message ?? "One or more uploads failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      {/* Tag */}
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Topic</label>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button key={t} type="button" onClick={() => setTag(t)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                tag === t ? TAG_STYLE[t] : "border-zinc-300 dark:border-zinc-700/50 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          placeholder="What's on your mind?" className={inputCls} />
      </div>
      {/* Body */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7}
          placeholder="Share your analysis, question, or hot take…"
          className={`${inputCls} resize-none leading-relaxed`} />
        <p className="mt-1 text-right text-[10px] text-zinc-500 dark:text-zinc-600">
          {body.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
      {/* Media */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Media <span className="normal-case font-normal text-zinc-400 dark:text-zinc-600">({mediaUrls.length}/4)</span>
          </label>
          {mediaUrls.length < 4 && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700/60 px-2.5 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition disabled:opacity-50">
              {uploading ? <FiLoader className="h-3 w-3 animate-spin" /> : <FiImage className="h-3 w-3" />}
              {uploading ? "Uploading…" : "Add image"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
        </div>
        {uploadErr && <p className="mb-2 text-[11px] text-red-500 dark:text-red-400">{uploadErr}</p>}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {mediaUrls.map((url, i) => (
              <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800/60">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition">
                  <FiX className="h-5 w-5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="rounded-lg border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

// ─── New Post Modal ────────────────────────────────────────────────────────────

function NewPostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tag, setTag]             = useState<ForumTag>("General");
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [mediaUrls, setMedia]     = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSub(true); setError(null);
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, title, body, mediaUrls }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post."); return; }
      onCreated(); onClose();
    } catch { setError("Something went wrong."); }
    finally { setSub(false); }
  }

  return (
    <ModalShell
      title="New Post"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition">Cancel</button>
          <button form="new-post-form" type="submit" disabled={!title.trim() || !body.trim() || submitting || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
            <FiSend className="h-3.5 w-3.5" />
            {submitting ? "Posting…" : "Post"}
          </button>
        </>
      }
    >
      <form id="new-post-form" onSubmit={handleSubmit}>
        <PostFormFields
          tag={tag} setTag={setTag} title={title} setTitle={setTitle}
          body={body} setBody={setBody} mediaUrls={mediaUrls} setMedia={setMedia}
          uploading={uploading} setUploading={setUploading}
          uploadErr={uploadErr} setUploadErr={setUploadErr}
          error={error} fileRef={fileRef}
        />
      </form>
    </ModalShell>
  );
}

// ─── Edit Post Modal ───────────────────────────────────────────────────────────

function EditPostModal({ post, onClose, onSaved }: {
  post: ForumPostDetail;
  onClose: () => void;
  onSaved: (updated: ForumPostDetail) => void;
}) {
  const [tag, setTag]             = useState<ForumTag>(post.tag);
  const [title, setTitle]         = useState(post.title);
  const [body, setBody]           = useState(post.body);
  const [mediaUrls, setMedia]     = useState<string[]>(post.mediaUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSub(true); setError(null);
    try {
      const res = await fetch(`/api/forum/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, title, body, mediaUrls }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      onSaved({ ...post, tag, title, body, mediaUrls, readTime: data.post.readTime });
      onClose();
    } catch { setError("Something went wrong."); }
    finally { setSub(false); }
  }

  return (
    <ModalShell
      title="Edit Post"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition">Cancel</button>
          <button form="edit-post-form" type="submit" disabled={!title.trim() || !body.trim() || submitting || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
            <FiSend className="h-3.5 w-3.5" />
            {submitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="edit-post-form" onSubmit={handleSubmit}>
        <PostFormFields
          tag={tag} setTag={setTag} title={title} setTitle={setTitle}
          body={body} setBody={setBody} mediaUrls={mediaUrls} setMedia={setMedia}
          uploading={uploading} setUploading={setUploading}
          uploadErr={uploadErr} setUploadErr={setUploadErr}
          error={error} fileRef={fileRef}
        />
      </form>
    </ModalShell>
  );
}

// ─── Post View Modal ───────────────────────────────────────────────────────────

function PostViewModal({ postId, onClose, onDeleted, onEdited }: {
  postId: string;
  onClose: () => void;
  onDeleted: () => void;
  onEdited?: () => void;
}) {
  const [post, setPost]          = useState<ForumPostDetail | null>(null);
  const [loaded, setLoaded]      = useState(false);
  const [commentBody, setCB]     = useState("");
  const [subComment, setSubC]    = useState(false);
  const [reacting, setReacting]  = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [deleting, setDeleting]  = useState(false);
  const [editing, setEditing]    = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/forum/posts/${postId}`)
      .then((r) => r.json())
      .then((d) => { if (d.post) setPost(d.post); })
      .finally(() => setLoaded(true));
  }, [postId]);

  async function react(value: 1 | -1) {
    if (!post || reacting) return;
    setReacting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/like`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const d = await res.json();
        setPost((p) => p ? { ...p, likes: d.likes, dislikes: d.dislikes, myReaction: d.myReaction } : p);
      }
    } finally { setReacting(false); }
  }

  async function deletePost() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: "DELETE" });
      if (res.ok) { onDeleted(); onClose(); }
    } finally { setDeleting(false); }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || subComment) return;
    setSubC(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (res.ok) {
        const d = await res.json();
        setPost((p) => p ? { ...p, comments: [...p.comments, d.comment] } : p);
        setCB("");
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally { setSubC(false); }
  }

  return (
    <>
      {editing && post && (
        <EditPostModal
          post={post}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { setPost(updated); onEdited?.(); setEditing(false); }}
        />
      )}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl dark:shadow-2xl flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2">
              {post && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLE[post.tag] ?? ""}`}>{post.tag}</span>}
            </div>
            <div className="flex items-center gap-1">
              {post?.canEdit && !confirmDel && (
                <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-zinc-500 hover:text-amber-600 dark:hover:text-[#F4D06F] hover:bg-amber-500/10 transition">
                  <FiEdit3 className="h-4 w-4" />
                </button>
              )}
              {post?.canDelete && !confirmDel && (
                <button onClick={() => setConfirm(true)} className="rounded-lg p-1.5 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              )}
              {post?.canDelete && confirmDel && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Delete?</span>
                  <button onClick={deletePost} disabled={deleting}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/30 transition disabled:opacity-50">
                    {deleting ? "Deleting…" : "Yes"}
                  </button>
                  <button onClick={() => setConfirm(false)} className="rounded-lg px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">Cancel</button>
                </div>
              )}
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition">
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {!loaded ? (
              <div className="px-6 py-8 space-y-3 animate-pulse">
                <div className="h-6 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800/60" />
                <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800/40" />
                {[...Array(5)].map((_, i) => <div key={i} className="h-3 rounded bg-zinc-200 dark:bg-zinc-800/40" style={{ width: `${85 - i * 5}%` }} />)}
              </div>
            ) : !post ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">Post not found.</p>
            ) : (
              <div className="px-6 py-6">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug mb-3">{post.title}</h1>
                <div className="flex items-center gap-3 mb-6">
                  <Avatar author={post.author} size="md" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{post.author.firstName} {post.author.lastName}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <FiClock className="h-3 w-3" />{post.readTime} · {timeAgo(post.publishedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap pb-6 mb-6">
                  {post.body}
                </div>

                {/* Media gallery */}
                {post.mediaUrls?.length > 0 && (
                  <div className={`mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800/60 grid gap-2 ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.mediaUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
                        <img src={url} alt="" className="w-full object-cover max-h-80" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-3 mb-8">
                  <button onClick={() => react(1)} disabled={reacting}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      post.myReaction === 1
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400"}`}>
                    <FiThumbsUp className="h-3.5 w-3.5" />{post.likes}
                  </button>
                  <button onClick={() => react(-1)} disabled={reacting}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      post.myReaction === -1
                        ? "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400"
                        : "border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400"}`}>
                    <FiThumbsDown className="h-3.5 w-3.5" />{post.dislikes}
                  </button>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <FiMessageSquare className="h-3.5 w-3.5" />
                    {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Comments */}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Comments</h3>
                {post.comments.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-600 italic mb-4">No comments yet. Be the first.</p>
                ) : (
                  <ul className="space-y-3 mb-4">
                    {post.comments.map((c) => (
                      <li key={c.id} className="flex gap-2.5">
                        <Avatar author={c.author} />
                        <div className="flex-1 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/50 px-3 py-2">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{c.author.firstName} {c.author.lastName}</span>
                            <span className="text-[10px] text-zinc-500">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{c.body}</p>
                        </div>
                      </li>
                    ))}
                    <div ref={endRef} />
                  </ul>
                )}
                <form onSubmit={submitComment} className="flex gap-2">
                  <input value={commentBody} onChange={(e) => setCB(e.target.value)} placeholder="Add a comment…"
                    className={`flex-1 ${inputCls}`} />
                  <button type="submit" disabled={!commentBody.trim() || subComment}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-3 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <FiSend className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Forum Page ───────────────────────────────────────────────────────────

export default function ForumPage() {
  const [posts, setPosts]             = useState<ForumPost[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [activeTag, setActiveTag]     = useState<ForumTag | null>(null);
  const [sort, setSort]               = useState<"new" | "hot">("new");
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState<string | null>(null);
  const [loadingMore, setLM]          = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [viewId, setViewId]           = useState<string | null>(null);

  const fetchPosts = useCallback(async (opts?: { tag?: ForumTag | null; sort?: "new" | "hot"; mine?: boolean; reset?: boolean; silent?: boolean }) => {
    const tag    = opts?.tag  !== undefined ? opts.tag  : activeTag;
    const s      = opts?.sort !== undefined ? opts.sort : sort;
    const mine   = opts?.mine !== undefined ? opts.mine : myPostsOnly;
    const reset  = opts?.reset ?? false;
    const silent = opts?.silent ?? false;
    if (reset && !silent) setLoaded(false);
    const params = new URLSearchParams({ sort: s, limit: "20" });
    if (tag) params.set("tag", tag);
    if (mine) params.set("mine", "true");
    try {
      const res = await fetch(`/api/forum/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(reset ? data.posts : (prev) => [...prev, ...data.posts]);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } finally { if (!silent) setLoaded(true); }
  }, [activeTag, sort, myPostsOnly]);

  useEffect(() => { fetchPosts({ reset: true }); }, [activeTag, sort, myPostsOnly]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLM(true);
    const params = new URLSearchParams({ sort, limit: "20", cursor });
    if (activeTag) params.set("tag", activeTag);
    if (myPostsOnly) params.set("mine", "true");
    try {
      const res = await fetch(`/api/forum/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } finally { setLM(false); }
  }

  function handleTagClick(tag: ForumTag) {
    setActiveTag(activeTag === tag ? null : tag);
    setLoaded(false);
  }

  function handleSortChange(s: "new" | "hot") {
    if (s === sort) return;
    setSort(s);
    setLoaded(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-10">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
            Community
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Forum</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Fantasy football talk, all in one place.</p>
            </div>
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition shadow-[0_0_20px_rgba(244,208,111,0.2)]">
              <FiEdit3 className="h-4 w-4" />
              New Post
            </button>
          </div>
        </div>

        {/* Tag filters */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button key={t} onClick={() => handleTagClick(t)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                activeTag === t
                  ? TAG_STYLE[t]
                  : "border-zinc-200 dark:border-zinc-800/60 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${activeTag === t ? TAG_DOT[t] : "bg-zinc-300 dark:bg-zinc-700"}`} />
              {t}
            </button>
          ))}
          {activeTag && (
            <button onClick={() => setActiveTag(null)}
              className="flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700/60 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
              <FiX className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Sort tabs + My Posts */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 p-1">
            <button onClick={() => handleSortChange("new")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sort === "new"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              <FiZap className="h-3.5 w-3.5" /> New
            </button>
            <button onClick={() => handleSortChange("hot")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sort === "hot"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
              <FiTrendingUp className="h-3.5 w-3.5" /> Hot
            </button>
          </div>
          <button
            onClick={() => { setMyPostsOnly((v) => !v); setLoaded(false); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              myPostsOnly
                ? "border-amber-400/50 bg-amber-500/10 text-amber-600 dark:border-[#F4D06F]/50 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F]"
                : "border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}>
            <FiUser className="h-3.5 w-3.5" /> My Posts
          </button>
        </div>

        {/* Feed */}
        {!loaded ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800/40 bg-white dark:bg-transparent p-4 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800/60" />
                  <div className="h-4 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800/40" />
                </div>
                <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800/60" />
                <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800/40" />
                <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800/40" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60">
              <FiFileText className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No posts yet</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600 max-w-xs">
              {activeTag ? `No ${activeTag} posts yet.` : "Be the first to start a discussion."}
            </p>
            <button onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition">
              <FiEdit3 className="h-3.5 w-3.5" /> Start a discussion
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {posts.map((post) => (
                <li key={post.id} onClick={() => setViewId(post.id)}
                  className="group rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/30 px-5 py-4 hover:border-zinc-300 dark:hover:border-zinc-700/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition cursor-pointer shadow-sm dark:shadow-none">
                  <div className="flex items-start gap-3">
                    <Avatar author={post.author} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLE[post.tag]}`}>
                          {post.tag}
                        </span>
                        <span className="text-[10px] text-zinc-500">{timeAgo(post.publishedAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white truncate">{post.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{post.excerpt}</p>
                      {post.mediaUrls?.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {post.mediaUrls.slice(0, 3).map((url, i) => (
                            <div key={i} className="h-14 w-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800/60 shrink-0">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {post.mediaUrls.length > 3 && (
                            <div className="h-14 w-14 rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-semibold text-zinc-500">+{post.mediaUrls.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500">
                        <span className="font-medium">{post.author.firstName} {post.author.lastName}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <span>{post.readTime}</span>
                        <span className="ml-auto flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><FiThumbsUp className="h-3 w-3" />{post._count.likes}</span>
                          <span className="inline-flex items-center gap-1"><FiThumbsDown className="h-3 w-3" />{post._count.dislikes}</span>
                          <span className="inline-flex items-center gap-1"><FiMessageSquare className="h-3 w-3" />{post._count.comments}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <button onClick={loadMore} disabled={loadingMore}
                className="mt-4 w-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800/60 py-3 text-xs text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700/60 transition disabled:opacity-50">
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewPostModal
          onClose={() => setShowNew(false)}
          onCreated={() => fetchPosts({ reset: true, silent: true })}
        />
      )}

      {viewId && (
        <PostViewModal
          postId={viewId}
          onClose={() => setViewId(null)}
          onDeleted={() => setPosts((prev) => prev.filter((p) => p.id !== viewId))}
          onEdited={() => fetchPosts({ reset: true, silent: true })}
        />
      )}
    </div>
  );
}
