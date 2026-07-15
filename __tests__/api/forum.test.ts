/**
 * Forum API tests — covers posts, reactions, comments, media, pagination,
 * auth guards, and high-volume concurrent behaviour.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/utils/actions", () => ({ getAuthUser: jest.fn() }));
jest.mock("@/utils/db", () => ({
  prisma: {
    profile:          { findUnique: jest.fn() },
    forumPost:        { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    forumPostLike:    { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    forumPostComment: { create: jest.fn() },
  },
}));
jest.mock("@/utils/supabase", () => ({ uploadImage: jest.fn() }));

import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { uploadImage } from "@/utils/supabase";
import { GET as getPosts, POST as createPost } from "@/app/api/forum/posts/route";
import { GET as getPost, DELETE as deletePost } from "@/app/api/forum/posts/[postId]/route";
import { POST as likePost } from "@/app/api/forum/posts/[postId]/like/route";
import { POST as addComment } from "@/app/api/forum/posts/[postId]/comments/route";
import { POST as uploadRoute } from "@/app/api/forum/upload/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROFILE_ID = 42;
const POST_ID    = "post-abc";
const OTHER_ID   = 99;

const mockUser   = { id: "clerk-1" };
const mockProfile = { id: PROFILE_ID };

const mockPost = {
  id: POST_ID,
  tag: "General",
  title: "Test post",
  body: "Body content here",
  excerpt: "Body content here",
  readTime: "1 min read",
  mediaUrls: [],
  publishedAt: new Date().toISOString(),
  authorId: PROFILE_ID,
  author: { id: PROFILE_ID, firstName: "Alice", lastName: "Smith", username: "alice", profileImage: "" },
};

function makeReq(url: string, opts: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url, opts);
}
function postCtx(postId = POST_ID) {
  return { params: Promise.resolve({ postId }) };
}

// ─── Helper: reset all mocks ──────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthUser as jest.Mock).mockResolvedValue(mockUser);
  (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
});

// ─── GET /api/forum/posts ─────────────────────────────────────────────────────

describe("GET /api/forum/posts", () => {
  it("returns paginated posts for authenticated user", async () => {
    (prisma.forumPost.findMany as jest.Mock).mockResolvedValue([
      { ...mockPost, likes: [], _count: { comments: 0 } },
    ]);

    const res = await getPosts(makeReq("http://localhost/api/forum/posts"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].title).toBe("Test post");
    expect(body.hasMore).toBe(false);
  });

  it("returns 401 when unauthenticated", async () => {
    (getAuthUser as jest.Mock).mockResolvedValue(null);
    const res = await getPosts(makeReq("http://localhost/api/forum/posts"));
    expect(res.status).toBe(401);
  });

  it("filters by valid tag", async () => {
    (prisma.forumPost.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getPosts(makeReq("http://localhost/api/forum/posts?tag=Draft"));
    expect(res.status).toBe(200);
    const call = (prisma.forumPost.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ tag: "Draft" });
  });

  it("ignores invalid tag filter", async () => {
    (prisma.forumPost.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getPosts(makeReq("http://localhost/api/forum/posts?tag=Nonsense"));
    expect(res.status).toBe(200);
    const call = (prisma.forumPost.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("paginates correctly — returns hasMore=true when extra record exists", async () => {
    const twentyOne = Array.from({ length: 21 }, (_, i) => ({
      ...mockPost, id: `p-${i}`, likes: [], _count: { comments: 0 },
    }));
    (prisma.forumPost.findMany as jest.Mock).mockResolvedValue(twentyOne);
    const res = await getPosts(makeReq("http://localhost/api/forum/posts?limit=20"));
    const body = await res.json();
    expect(body.hasMore).toBe(true);
    expect(body.posts).toHaveLength(20);
    expect(body.nextCursor).toBe("p-19");
  });

  it("hot sort returns posts sorted by net score descending", async () => {
    const posts = [
      { ...mockPost, id: "p-1", likes: [{ value: 1 }, { value: 1 }], _count: { comments: 0 } },
      { ...mockPost, id: "p-2", likes: [{ value: 1 }, { value: 1 }, { value: 1 }], _count: { comments: 0 } },
      { ...mockPost, id: "p-3", likes: [], _count: { comments: 0 } },
    ];
    (prisma.forumPost.findMany as jest.Mock).mockResolvedValue(posts);
    const res = await getPosts(makeReq("http://localhost/api/forum/posts?sort=hot"));
    const body = await res.json();
    expect(body.posts[0].id).toBe("p-2");
    expect(body.posts[1].id).toBe("p-1");
    expect(body.posts[2].id).toBe("p-3");
  });

  it("handles concurrent requests without cross-contamination", async () => {
    (prisma.forumPost.findMany as jest.Mock).mockImplementation(({ where }) =>
      Promise.resolve([{ ...mockPost, id: where?.tag ?? "all", likes: [], _count: { comments: 0 } }])
    );
    const results = await Promise.all(
      ["Draft", "Playoffs", "General", "Trash Talk"].map((tag) =>
        getPosts(makeReq(`http://localhost/api/forum/posts?tag=${encodeURIComponent(tag)}`))
          .then((r) => r.json())
      )
    );
    expect(results[0].posts[0].id).toBe("Draft");
    expect(results[1].posts[0].id).toBe("Playoffs");
    expect(results[2].posts[0].id).toBe("General");
    expect(results[3].posts[0].id).toBe("Trash Talk");
  });
});

// ─── POST /api/forum/posts ────────────────────────────────────────────────────

describe("POST /api/forum/posts", () => {
  function makeCreateReq(body: object) {
    return new NextRequest("http://localhost/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("creates a post successfully", async () => {
    (prisma.forumPost.create as jest.Mock).mockResolvedValue({ ...mockPost, mediaUrls: [] });
    const res = await createPost(makeCreateReq({ tag: "General", title: "Hello", body: "World" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.post.title).toBe("Test post");
  });

  it("returns 400 for invalid tag", async () => {
    const res = await createPost(makeCreateReq({ tag: "BadTag", title: "Hi", body: "Text" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing title", async () => {
    const res = await createPost(makeCreateReq({ tag: "General", title: "", body: "Text" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const res = await createPost(makeCreateReq({ tag: "General", title: "Title", body: "  " }));
    expect(res.status).toBe(400);
  });

  it("caps mediaUrls at 4", async () => {
    (prisma.forumPost.create as jest.Mock).mockResolvedValue({ ...mockPost, mediaUrls: [] });
    const sixUrls = Array.from({ length: 6 }, (_, i) => `https://cdn.example.com/img${i}.jpg`);
    await createPost(makeCreateReq({ tag: "General", title: "Pics", body: "See below", mediaUrls: sixUrls }));
    const call = (prisma.forumPost.create as jest.Mock).mock.calls[0][0];
    expect(call.data.mediaUrls).toHaveLength(4);
  });

  it("strips non-string entries from mediaUrls", async () => {
    (prisma.forumPost.create as jest.Mock).mockResolvedValue({ ...mockPost, mediaUrls: [] });
    await createPost(makeCreateReq({ tag: "General", title: "Hi", body: "Body", mediaUrls: ["url1", 42, null, "url2"] }));
    const call = (prisma.forumPost.create as jest.Mock).mock.calls[0][0];
    expect(call.data.mediaUrls).toEqual(["url1", "url2"]);
  });

  it("returns 401 when unauthenticated", async () => {
    (getAuthUser as jest.Mock).mockResolvedValue(null);
    const res = await createPost(makeCreateReq({ tag: "General", title: "Hi", body: "Bye" }));
    expect(res.status).toBe(401);
  });

  it("handles 50 concurrent creates without DB mutation errors", async () => {
    let callCount = 0;
    (prisma.forumPost.create as jest.Mock).mockImplementation(() => {
      callCount++;
      return Promise.resolve({ ...mockPost, id: `p-${callCount}`, mediaUrls: [] });
    });
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        createPost(makeCreateReq({ tag: "General", title: `Post ${i}`, body: "Content" }))
          .then((r) => r.status)
      )
    );
    expect(results.every((s) => s === 201)).toBe(true);
    expect(callCount).toBe(50);
  });
});

// ─── GET /api/forum/posts/[postId] ────────────────────────────────────────────

describe("GET /api/forum/posts/[postId]", () => {
  it("returns full post with reactions and comments", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({
      ...mockPost,
      likes: [{ profileId: PROFILE_ID, value: 1 }, { profileId: OTHER_ID, value: -1 }],
      comments: [{ id: "c-1", body: "Nice", createdAt: new Date().toISOString(), author: mockPost.author }],
    });
    const res = await getPost(makeReq(`http://localhost/api/forum/posts/${POST_ID}`), postCtx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.post.likes).toBe(1);
    expect(body.post.dislikes).toBe(1);
    expect(body.post.myReaction).toBe(1);
    expect(body.post.canDelete).toBe(true);
    expect(body.post.comments).toHaveLength(1);
  });

  it("canDelete is false for non-author", async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ id: OTHER_ID });
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ ...mockPost, likes: [], comments: [] });
    const res = await getPost(makeReq(`http://localhost/api/forum/posts/${POST_ID}`), postCtx());
    const body = await res.json();
    expect(body.post.canDelete).toBe(false);
  });

  it("returns 404 for missing post", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await getPost(makeReq(`http://localhost/api/forum/posts/missing`), postCtx("missing"));
    expect(res.status).toBe(404);
  });

  it("myReaction is null when user has not reacted", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ ...mockPost, likes: [], comments: [] });
    const res = await getPost(makeReq(`http://localhost/api/forum/posts/${POST_ID}`), postCtx());
    const body = await res.json();
    expect(body.post.myReaction).toBeNull();
  });
});

// ─── DELETE /api/forum/posts/[postId] ─────────────────────────────────────────

describe("DELETE /api/forum/posts/[postId]", () => {
  it("allows author to delete their post", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ authorId: PROFILE_ID });
    (prisma.forumPost.delete as jest.Mock).mockResolvedValue({});
    const res = await deletePost(makeReq(`http://localhost/api/forum/posts/${POST_ID}`, { method: "DELETE" }), postCtx());
    expect(res.status).toBe(200);
  });

  it("returns 403 when non-author tries to delete", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ authorId: OTHER_ID });
    const res = await deletePost(makeReq(`http://localhost/api/forum/posts/${POST_ID}`, { method: "DELETE" }), postCtx());
    expect(res.status).toBe(403);
    expect(prisma.forumPost.delete).not.toHaveBeenCalled();
  });

  it("returns 404 for non-existent post", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await deletePost(makeReq(`http://localhost/api/forum/posts/missing`, { method: "DELETE" }), postCtx("missing"));
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/forum/posts/[postId]/like ──────────────────────────────────────

describe("POST /api/forum/posts/[postId]/like", () => {
  function makeReaction(value: number) {
    return new NextRequest(`http://localhost/api/forum/posts/${POST_ID}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  }

  const allLikes = [{ profileId: PROFILE_ID, value: 1 }];

  it("adds an upvote", async () => {
    (prisma.forumPostLike.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.forumPostLike.upsert as jest.Mock).mockResolvedValue({});
    (prisma.forumPostLike.findMany as jest.Mock).mockResolvedValue(allLikes);
    const res = await likePost(makeReaction(1), postCtx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.likes).toBe(1);
    expect(body.myReaction).toBe(1);
  });

  it("toggles off an existing upvote", async () => {
    (prisma.forumPostLike.findUnique as jest.Mock).mockResolvedValue({ value: 1 });
    (prisma.forumPostLike.delete as jest.Mock).mockResolvedValue({});
    (prisma.forumPostLike.findMany as jest.Mock).mockResolvedValue([]);
    const res = await likePost(makeReaction(1), postCtx());
    const body = await res.json();
    expect(prisma.forumPostLike.delete).toHaveBeenCalled();
    expect(body.myReaction).toBeNull();
  });

  it("switches from upvote to downvote", async () => {
    (prisma.forumPostLike.findUnique as jest.Mock).mockResolvedValue({ value: 1 });
    (prisma.forumPostLike.upsert as jest.Mock).mockResolvedValue({});
    (prisma.forumPostLike.findMany as jest.Mock).mockResolvedValue([{ profileId: PROFILE_ID, value: -1 }]);
    const res = await likePost(makeReaction(-1), postCtx());
    const body = await res.json();
    expect(body.myReaction).toBe(-1);
    expect(body.dislikes).toBe(1);
  });

  it("returns 400 for invalid reaction value", async () => {
    const res = await likePost(makeReaction(0), postCtx());
    expect(res.status).toBe(400);
  });

  it("handles 100 concurrent reactions gracefully", async () => {
    (prisma.forumPostLike.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.forumPostLike.upsert as jest.Mock).mockResolvedValue({});
    (prisma.forumPostLike.findMany as jest.Mock).mockResolvedValue([]);
    const results = await Promise.all(
      Array.from({ length: 100 }, () => likePost(makeReaction(1), postCtx()).then((r) => r.status))
    );
    expect(results.every((s) => s === 200)).toBe(true);
  });
});

// ─── POST /api/forum/posts/[postId]/comments ──────────────────────────────────

describe("POST /api/forum/posts/[postId]/comments", () => {
  function makeCommentReq(body: string) {
    return new NextRequest(`http://localhost/api/forum/posts/${POST_ID}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
  }

  it("adds a comment successfully", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ id: POST_ID });
    (prisma.forumPostComment.create as jest.Mock).mockResolvedValue({
      id: "c-1", body: "Great post!", createdAt: new Date().toISOString(), author: mockPost.author,
    });
    const res = await addComment(makeCommentReq("Great post!"), postCtx());
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.comment.body).toBe("Great post!");
  });

  it("returns 400 for empty comment", async () => {
    const res = await addComment(makeCommentReq("  "), postCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when post not found", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await addComment(makeCommentReq("Nice"), postCtx());
    expect(res.status).toBe(404);
  });

  it("handles 200 concurrent comments without errors", async () => {
    (prisma.forumPost.findUnique as jest.Mock).mockResolvedValue({ id: POST_ID });
    let count = 0;
    (prisma.forumPostComment.create as jest.Mock).mockImplementation(() => {
      count++;
      return Promise.resolve({ id: `c-${count}`, body: "comment", createdAt: new Date().toISOString(), author: mockPost.author });
    });
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        addComment(makeCommentReq(`Comment ${i}`), postCtx()).then((r) => r.status)
      )
    );
    expect(results.every((s) => s === 201)).toBe(true);
    expect(count).toBe(200);
  });
});

// ─── POST /api/forum/upload ────────────────────────────────────────────────────

describe("POST /api/forum/upload", () => {
  function makeUploadReq(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return new NextRequest("http://localhost/api/forum/upload", { method: "POST", body: fd });
  }

  it("uploads a valid image and returns URL", async () => {
    (uploadImage as jest.Mock).mockResolvedValue("https://cdn.example.com/img.jpg");
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const res = await uploadRoute(makeUploadReq(file));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://cdn.example.com/img.jpg");
  });

  it("rejects files over 8MB", async () => {
    const bigBuffer = new Uint8Array(9 * 1024 * 1024);
    const file = new File([bigBuffer], "big.jpg", { type: "image/jpeg" });
    const res = await uploadRoute(makeUploadReq(file));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8MB/);
  });

  it("rejects non-image file types", async () => {
    const file = new File(["<html>"], "hack.html", { type: "text/html" });
    const res = await uploadRoute(makeUploadReq(file));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no file is provided", async () => {
    const req = new NextRequest("http://localhost/api/forum/upload", {
      method: "POST",
      body: new FormData(),
    });
    const res = await uploadRoute(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when Supabase upload fails", async () => {
    (uploadImage as jest.Mock).mockRejectedValue(new Error("Storage quota exceeded"));
    const file = new File(["data"], "photo.png", { type: "image/png" });
    const res = await uploadRoute(makeUploadReq(file));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Storage quota exceeded");
  });

  it("handles 20 concurrent uploads", async () => {
    let n = 0;
    (uploadImage as jest.Mock).mockImplementation(() => Promise.resolve(`https://cdn.example.com/img${n++}.jpg`));
    const results = await Promise.all(
      Array.from({ length: 20 }, () => {
        const file = new File(["x"], "img.webp", { type: "image/webp" });
        return uploadRoute(makeUploadReq(file)).then((r) => r.status);
      })
    );
    expect(results.every((s) => s === 200)).toBe(true);
    expect(n).toBe(20);
  });
});
