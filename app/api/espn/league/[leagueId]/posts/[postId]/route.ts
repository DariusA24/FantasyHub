import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { requireEspnLeagueAccess, AUTHOR_SELECT } from "../_access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; postId: string }> },
) {
  try {
    const { leagueId, postId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

    const [post, myReaction] = await Promise.all([
      prisma.hubLeaguePost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          espnLeagueId: true,
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
        where: { postId_profileId: { postId, profileId: access.profile.id } },
        select: { value: true },
      }),
    ]);

    if (!post || post.espnLeagueId !== leagueId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const likes    = post.likes.filter((l) => l.value === 1).length;
    const dislikes = post.likes.filter((l) => l.value === -1).length;
    const canDelete = access.profile.id === post.authorId;

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
    console.error("[espn post GET] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; postId: string }> },
) {
  try {
    const { leagueId, postId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

    const post = await prisma.hubLeaguePost.findUnique({
      where: { id: postId },
      select: { authorId: true, espnLeagueId: true },
    });

    if (!post || post.espnLeagueId !== leagueId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.authorId !== access.profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubLeaguePost.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[espn post DELETE] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
