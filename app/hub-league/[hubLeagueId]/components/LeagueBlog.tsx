"use client";

import { useEffect, useState } from "react";
import { FiEdit3, FiFileText, FiThumbsUp, FiThumbsDown, FiMessageSquare } from "react-icons/fi";
import { NewPostModal } from "./NewPostModal";
import { PostViewModal } from "./PostViewModal";

export type BlogPostTag = "Recap" | "Trade" | "Power Rankings" | "Trash Talk" | "Injury" | "News";

export type BlogPost = {
  id: string;
  tag: BlogPostTag;
  weekLabel: string;
  title: string;
  excerpt: string;
  readTime: string;
  publishedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    profileImage: string;
  };
  _count: {
    likes: number;
    dislikes: number;
    comments: number;
  };
};

const TAG_STYLE: Record<BlogPostTag, string> = {
  Recap:            "border-[var(--field)]/30 bg-[var(--field)]/10 text-[var(--field-2)]",
  Trade:            "border-[var(--field)]/30 bg-[var(--field)]/10 text-[var(--field-2)]",
  "Power Rankings": "border-[var(--gold)]/40 bg-[var(--gold-bright)]/10 text-[var(--gold)]",
  "Trash Talk":     "border-[var(--clay)]/40 bg-[var(--clay)]/10 text-[var(--clay)]",
  Injury:           "border-[var(--leather)]/40 bg-[var(--leather)]/10 text-[var(--leather)]",
  News:             "border-[var(--line-2)] bg-[var(--card-2)]/60 text-[var(--ink-2)]",
};

type Props = {
  /** API prefix that owns the posts, e.g. `/api/hub-leagues/{id}` or `/api/espn/league/{id}` */
  apiBase: string;
};

export function LeagueBlog({ apiBase }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [viewPostId, setViewPostId] = useState<string | null>(null);

  async function fetchPosts() {
    try {
      const res = await fetch(`${apiBase}/posts`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.posts)) setPosts(data.posts);
      }
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, [apiBase]);

  return (
    <>
      <section className="md:col-span-3 hub-card p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">League Blog</h2>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
              News, recaps, and trash talk from your league
            </p>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--field)]/40 bg-[var(--field)]/8 px-3 py-1.5 text-[11px] font-medium text-[var(--field-2)] hover:bg-[var(--field)]/15 transition"
          >
            <FiEdit3 className="h-3 w-3" />
            New Post
          </button>
        </div>

        {/* Loading skeleton */}
        {!loaded ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--line)] px-4 py-3 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-16 rounded-full bg-[var(--card-2)]" />
                  <div className="h-4 w-12 rounded-full bg-[var(--card-2)]/70" />
                </div>
                <div className="h-4 w-3/4 rounded bg-[var(--card-2)]" />
                <div className="h-3 w-full rounded bg-[var(--card-2)]/70" />
                <div className="h-3 w-2/3 rounded bg-[var(--card-2)]/70" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--card-2)]/60">
              <FiFileText className="h-5 w-5 text-[var(--ink-3)]" />
            </div>
            <p className="text-sm font-medium text-[var(--ink-2)]">No posts yet</p>
            <p className="mt-1 text-xs text-[var(--ink-3)] max-w-[200px]">
              Be the first to write a recap, call out a trade, or start some trash talk.
            </p>
            <button
              onClick={() => setShowNewPost(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--field)]/40 bg-[var(--field)]/8 px-3 py-1.5 text-[11px] font-medium text-[var(--field-2)] hover:bg-[var(--field)]/15 transition"
            >
              <FiEdit3 className="h-3 w-3" />
              Write the first post
            </button>
          </div>
        ) : (
          /* Post list */
          <>
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  onClick={() => setViewPostId(post.id)}
                  className="group hub-inner-card rounded-xl px-4 py-3 hover:border-[var(--line-2)] transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLE[post.tag] ?? TAG_STYLE.News}`}>
                          {post.tag}
                        </span>
                        <span className="text-[10px] text-[var(--ink-3)]">{post.weekLabel}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--field-2)] truncate">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ink-2)] line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {post.author.profileImage ? (
                      <img
                        src={post.author.profileImage}
                        alt={post.author.username}
                        className="h-4 w-4 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-[var(--card-2)] shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--ink-2)]">
                        {post.author.firstName[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] text-[var(--ink-2)]">
                      {post.author.firstName} {post.author.lastName}
                    </span>
                    <span className="text-[10px] text-[var(--ink-3)]">·</span>
                    <span className="text-[10px] text-[var(--ink-3)]">{post.readTime}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
                        <FiThumbsUp className="h-3 w-3" />{post._count.likes}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
                        <FiThumbsDown className="h-3 w-3" />{post._count.dislikes ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
                        <FiMessageSquare className="h-3 w-3" />{post._count.comments}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-3 w-full rounded-xl border border-dashed border-[var(--line-2)] py-2.5 text-xs text-[var(--ink-3)] hover:text-[var(--ink-2)] hover:border-[var(--field)]/50 transition">
              View all posts
            </button>
          </>
        )}
      </section>

      {showNewPost && (
        <NewPostModal
          apiBase={apiBase}
          onClose={() => setShowNewPost(false)}
          onCreated={() => fetchPosts()}
        />
      )}

      {viewPostId && (
        <PostViewModal
          apiBase={apiBase}
          postId={viewPostId}
          onClose={() => setViewPostId(null)}
          onDeleted={() => setPosts((prev) => prev.filter((p) => p.id !== viewPostId))}
        />
      )}
    </>
  );
}
