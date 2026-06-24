import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

const VALID_TAGS = ["Trade Advice", "Waiver Wire", "Start/Sit", "Draft", "Trash Talk", "Playoffs", "News", "General"];

function calcReadTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function deriveExcerpt(body: string): string {
  const plain = body.replace(/[#*_`>\-]/g, "").trim();
  return plain.length > 200 ? plain.slice(0, 200).trimEnd() + "…" : plain;
}

type Ctx = { params: Promise<{ postId: string }> | { postId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ postId: string }>)
    : (ctx.params as { postId: string });
}

// GET /api/forum/posts/[postId]
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { postId } = await rp(ctx);
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const raw = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: {
        id: true, tag: true, title: true, body: true, readTime: true, mediaUrls: true, publishedAt: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
        likes: { select: { profileId: true, value: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, body: true, createdAt: true,
            author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
          },
        },
      },
    });

    if (!raw) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const myLike = raw.likes.find((l) => l.profileId === profile.id);
    const post = {
      ...raw,
      likes:     raw.likes.filter((l) => l.value === 1).length,
      dislikes:  raw.likes.filter((l) => l.value === -1).length,
      myReaction: (myLike?.value ?? null) as 1 | -1 | null,
      canDelete: raw.author.id === profile.id,
      canEdit: raw.author.id === profile.id,
    };

    return NextResponse.json({ post });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// PATCH /api/forum/posts/[postId]
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { postId } = await rp(ctx);
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const existing = await prisma.forumPost.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.authorId !== profile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { tag, title, body, mediaUrls } = await req.json();
    if (!VALID_TAGS.includes(tag)) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "title and body are required" }, { status: 400 });

    const safeMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls.filter((u: unknown) => typeof u === "string").slice(0, 4)
      : [];

    const updated = await prisma.forumPost.update({
      where: { id: postId },
      data: {
        tag,
        title: title.trim(),
        body: body.trim(),
        excerpt: deriveExcerpt(body),
        readTime: calcReadTime(body),
        mediaUrls: safeMediaUrls,
      },
      select: {
        id: true, tag: true, title: true, body: true, excerpt: true,
        readTime: true, mediaUrls: true, publishedAt: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
      },
    });

    return NextResponse.json({ post: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// DELETE /api/forum/posts/[postId]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { postId } = await rp(ctx);
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.authorId !== profile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.forumPost.delete({ where: { id: postId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
