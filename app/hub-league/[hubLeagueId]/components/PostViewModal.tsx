"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiThumbsUp, FiThumbsDown, FiSend, FiClock, FiMessageSquare, FiTrash2 } from "react-icons/fi";
import type { BlogPostTag } from "./LeagueBlog";

const TAG_STYLE: Record<BlogPostTag, string> = {
  Recap:            "border-blue-500/30 bg-blue-500/10 text-blue-400",
  Trade:            "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "Power Rankings": "border-[#F4D06F]/30 bg-[#F4D06F]/10 text-[#F4D06F]",
  "Trash Talk":     "border-red-500/30 bg-red-500/10 text-red-400",
  Injury:           "border-orange-500/30 bg-orange-500/10 text-orange-400",
  News:             "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

type Author = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};

type PostDetail = {
  id: string;
  tag: BlogPostTag;
  weekLabel: string;
  title: string;
  body: string;
  readTime: string;
  publishedAt: string;
  author: Author;
  likes: number;
  dislikes: number;
  myReaction: 1 | -1 | null;
  comments: Comment[];
  canDelete: boolean;
};

type Props = {
  hubLeagueId: string;
  postId: string;
  onClose: () => void;
  onDeleted: () => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function PostViewModal({ hubLeagueId, postId, onClose, onDeleted }: Props) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/hub-leagues/${hubLeagueId}/posts/${postId}`)
      .then((r) => r.json())
      .then((data) => { if (data.post) setPost(data.post); })
      .finally(() => setLoaded(true));
  }, [hubLeagueId, postId]);

  async function handleReaction(value: 1 | -1) {
    if (!post || reacting) return;
    setReacting(true);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((p) => p ? { ...p, likes: data.likes, dislikes: data.dislikes, myReaction: data.myReaction } : p);
      }
    } finally {
      setReacting(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((p) => p ? { ...p, comments: [...p.comments, data.comment] } : p);
        setCommentBody("");
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            {post && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLE[post.tag] ?? TAG_STYLE.News}`}>
                {post.tag}
              </span>
            )}
            {post && (
              <span className="text-[11px] text-zinc-600">{post.weekLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {post?.canDelete && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition"
                title="Delete post"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            )}
            {post?.canDelete && confirmDelete && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-zinc-400">Delete this post?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="px-6 py-8 space-y-4 animate-pulse">
              <div className="h-6 w-3/4 rounded bg-zinc-800/60" />
              <div className="h-4 w-1/3 rounded bg-zinc-800/40" />
              <div className="mt-6 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-3 rounded bg-zinc-800/40" style={{ width: `${85 - i * 5}%` }} />
                ))}
              </div>
            </div>
          ) : !post ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">Post not found.</p>
          ) : (
            <div className="px-6 py-6">
              {/* Title + meta */}
              <h1 className="text-xl font-bold text-zinc-100 leading-snug mb-3">{post.title}</h1>
              <div className="flex items-center gap-3 mb-6">
                {post.author.profileImage ? (
                  <img src={post.author.profileImage} alt={post.author.username} className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                    {post.author.firstName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-zinc-400">{post.author.firstName} {post.author.lastName}</span>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600">
                  <FiClock className="h-3 w-3" /> {post.readTime}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-600">{timeAgo(post.publishedAt)}</span>
              </div>

              {/* Body */}
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap border-b border-zinc-800/60 pb-6 mb-6">
                {post.body}
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => handleReaction(1)}
                  disabled={reacting}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    post.myReaction === 1
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                      : "border-zinc-700/60 bg-zinc-900/60 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400"
                  }`}
                >
                  <FiThumbsUp className="h-3.5 w-3.5" />
                  {post.likes}
                </button>
                <button
                  onClick={() => handleReaction(-1)}
                  disabled={reacting}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    post.myReaction === -1
                      ? "border-red-500/50 bg-red-500/15 text-red-400"
                      : "border-zinc-700/60 bg-zinc-900/60 text-zinc-400 hover:border-red-500/40 hover:text-red-400"
                  }`}
                >
                  <FiThumbsDown className="h-3.5 w-3.5" />
                  {post.dislikes}
                </button>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
                  <FiMessageSquare className="h-3.5 w-3.5" />
                  {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Comments</h3>
                {post.comments.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic mb-4">No comments yet. Be the first.</p>
                ) : (
                  <ul className="space-y-3 mb-4">
                    {post.comments.map((c) => (
                      <li key={c.id} className="flex gap-2.5">
                        {c.author.profileImage ? (
                          <img src={c.author.profileImage} alt={c.author.username} className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0 mt-0.5">
                            {c.author.firstName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 rounded-xl bg-zinc-900/60 border border-zinc-800/50 px-3 py-2">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-zinc-300">
                              {c.author.firstName} {c.author.lastName}
                            </span>
                            <span className="text-[10px] text-zinc-600">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{c.body}</p>
                        </div>
                      </li>
                    ))}
                    <div ref={commentsEndRef} />
                  </ul>
                )}

                {/* Comment input */}
                <form onSubmit={handleComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20"
                  />
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || submittingComment}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4D06F] px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiSend className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
