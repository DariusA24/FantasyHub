import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type Ctx = { params: Promise<{ postId: string }> | { postId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ postId: string }>)
    : (ctx.params as { postId: string });
}

// POST /api/forum/posts/[postId]/comments  { body: string }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { postId } = await rp(ctx);
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });

    const comment = await prisma.forumPostComment.create({
      data: { postId, authorId: profile.id, body: body.trim() },
      select: {
        id: true, body: true, createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
