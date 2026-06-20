import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

function calcReadTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function deriveExcerpt(body: string): string {
  const plain = body.replace(/[#*_`>\-]/g, "").trim();
  return plain.length > 200 ? plain.slice(0, 200).trimEnd() + "…" : plain;
}

// ─── GET /api/hub-leagues/[hubLeagueId]/posts ────────────────────────────────

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify membership
    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const membership = await prisma.hubLeagueMember.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rawPosts = await prisma.hubLeaguePost.findMany({
      where: { hubLeagueId },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        tag: true,
        weekLabel: true,
        title: true,
        excerpt: true,
        readTime: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profileImage: true,
          },
        },
        likes: { select: { value: true } },
        _count: { select: { comments: true } },
      },
    });

    const posts = rawPosts.map(({ likes, _count, ...p }) => ({
      ...p,
      _count: {
        likes:    likes.filter((l) => l.value === 1).length,
        dislikes: likes.filter((l) => l.value === -1).length,
        comments: _count.comments,
      },
    }));

    return NextResponse.json({ posts });
  } catch (e: any) {
    console.error("[posts GET] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// ─── POST /api/hub-leagues/[hubLeagueId]/posts ───────────────────────────────

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Only members can post
    const membership = await prisma.hubLeagueMember.findUnique({
      where: { hubLeagueId_profileId: { hubLeagueId, profileId: profile.id } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { tag, weekLabel, title, body: postBody } = body;

    if (!tag || !weekLabel || !title?.trim() || !postBody?.trim()) {
      return NextResponse.json({ error: "tag, weekLabel, title, and body are required" }, { status: 400 });
    }

    const VALID_TAGS = ["Recap", "Trade", "Power Rankings", "Trash Talk", "Injury", "News"];
    if (!VALID_TAGS.includes(tag)) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    const post = await prisma.hubLeaguePost.create({
      data: {
        hubLeagueId,
        authorId: profile.id,
        tag,
        weekLabel: weekLabel.trim(),
        title: title.trim(),
        body: postBody.trim(),
        excerpt: deriveExcerpt(postBody),
        readTime: calcReadTime(postBody),
      },
      select: {
        id: true,
        tag: true,
        weekLabel: true,
        title: true,
        excerpt: true,
        readTime: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (e: any) {
    console.error("[posts POST] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
