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
  Recap:            "border-blue-500/30 bg-blue-500/10 text-blue-400",
  Trade:            "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "Power Rankings": "border-[#F4D06F]/30 bg-[#F4D06F]/10 text-[#F4D06F]",
  "Trash Talk":     "border-red-500/30 bg-red-500/10 text-red-400",
  Injury:           "border-orange-500/30 bg-orange-500/10 text-orange-400",
  News:             "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

type Props = {
  hubLeagueId: string;
};

export function LeagueBlog({ hubLeagueId }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [viewPostId, setViewPostId] = useState<string | null>(null);

  async function fetchPosts() {
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/posts`);
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
  }, [hubLeagueId]);

  return (
    <>
      <section className="col-span-3 hub-card p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">League Blog</h2>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
              News, recaps, and trash talk from your league
            </p>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
          >
            <FiEdit3 className="h-3 w-3" />
            New Post
          </button>
        </div>

        {/* Loading skeleton */}
        {!loaded ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800/40 px-4 py-3 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-16 rounded-full bg-zinc-800/60" />
                  <div className="h-4 w-12 rounded-full bg-zinc-800/40" />
                </div>
                <div className="h-4 w-3/4 rounded bg-zinc-800/60" />
                <div className="h-3 w-full rounded bg-zinc-800/40" />
                <div className="h-3 w-2/3 rounded bg-zinc-800/40" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-900/60">
              <FiFileText className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No posts yet</p>
            <p className="mt-1 text-xs text-zinc-600 max-w-[200px]">
              Be the first to write a recap, call out a trade, or start some trash talk.
            </p>
            <button
              onClick={() => setShowNewPost(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-3 py-1.5 text-[11px] font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
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
                  className="group hub-inner-card rounded-xl px-4 py-3 hover:border-zinc-700/60 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLE[post.tag] ?? TAG_STYLE.News}`}>
                          {post.tag}
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-zinc-600">{post.weekLabel}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-white truncate">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500 line-clamp-2">
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
                      <div className="h-4 w-4 rounded-full bg-zinc-700 shrink-0 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                        {post.author.firstName[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {post.author.firstName} {post.author.lastName}
                    </span>
                    <span className="text-[10px] text-gray-200 dark:text-zinc-700">·</span>
                    <span className="text-[10px] text-gray-300 dark:text-zinc-600">{post.readTime}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                        <FiThumbsUp className="h-3 w-3" />{post._count.likes}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                        <FiThumbsDown className="h-3 w-3" />{post._count.dislikes ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                        <FiMessageSquare className="h-3 w-3" />{post._count.comments}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-3 w-full rounded-xl border border-dashed border-zinc-800/60 py-2.5 text-xs text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 hover:border-zinc-700/60 transition">
              View all posts
            </button>
          </>
        )}
      </section>

      {showNewPost && (
        <NewPostModal
          hubLeagueId={hubLeagueId}
          onClose={() => setShowNewPost(false)}
          onCreated={() => fetchPosts()}
        />
      )}

      {viewPostId && (
        <PostViewModal
          hubLeagueId={hubLeagueId}
          postId={viewPostId}
          onClose={() => setViewPostId(null)}
          onDeleted={() => setPosts((prev) => prev.filter((p) => p.id !== viewPostId))}
        />
      )}
    </>
  );
}
