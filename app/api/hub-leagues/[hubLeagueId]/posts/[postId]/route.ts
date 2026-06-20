import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string; postId: string }> | { hubLeagueId: string; postId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string; postId: string }>)
    : (ctx.params as { hubLeagueId: string; postId: string });
}

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  profileImage: true,
} as const;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId, postId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const membership = await prisma.hubLeagueMember.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [post, myReaction, hubLeague] = await Promise.all([
      prisma.hubLeaguePost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          tag: true,
          weekLabel: true,
          title: true,
          body: true,
          readTime: true,
          publishedAt: true,
          authorId: true,
          author: { select: AUTHOR_SELECT },
          likes: { select: { value: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              body: true,
              createdAt: true,
              author: { select: AUTHOR_SELECT },
            },
          },
        },
      }),
      prisma.hubLeaguePostLike.findUnique({
        where: { postId_profileId: { postId, profileId: profile.id } },
        select: { value: true },
      }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: { ownerId: true },
      }),
    ]);

    if (!post || post.author === null) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const likes    = post.likes.filter((l) => l.value === 1).length;
    const dislikes = post.likes.filter((l) => l.value === -1).length;
    const canDelete = profile.id === hubLeague?.ownerId || profile.id === post.authorId;

    return NextResponse.json({
      post: {
        id: post.id,
        tag: post.tag,
        weekLabel: post.weekLabel,
        title: post.title,
        body: post.body,
        readTime: post.readTime,
        publishedAt: post.publishedAt,
        author: post.author,
        likes,
        dislikes,
        myReaction: myReaction?.value ?? null,
        comments: post.comments,
        canDelete,
      },
    });
  } catch (e: any) {
    console.error("[post GET] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId, postId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague, post] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({ where: { id: hubLeagueId }, select: { ownerId: true } }),
      prisma.hubLeaguePost.findUnique({ where: { id: postId }, select: { authorId: true } }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!post)    return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const isLeagueOwner = profile.id === hubLeague?.ownerId;
    const isPostAuthor  = profile.id === post.authorId;

    if (!isLeagueOwner && !isPostAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubLeaguePost.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[post DELETE] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
