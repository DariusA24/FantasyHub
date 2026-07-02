import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { requireEspnLeagueAccess, AUTHOR_SELECT } from "./_access";

function calcReadTime(body: string): string {
  const words = body.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function deriveExcerpt(body: string): string {
  const plain = body.replace(/[#*_`>\-]/g, "").trim();
  return plain.length > 200 ? plain.slice(0, 200).trimEnd() + "…" : plain;
}

// ─── GET /api/espn/league/[leagueId]/posts ───────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

    const rawPosts = await prisma.hubLeaguePost.findMany({
      where: { espnLeagueId: leagueId },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        tag: true,
        weekLabel: true,
        title: true,
        excerpt: true,
        readTime: true,
        publishedAt: true,
        author: { select: AUTHOR_SELECT },
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
    console.error("[espn posts GET] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// ─── POST /api/espn/league/[leagueId]/posts ──────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    const { leagueId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

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
        espnLeagueId: leagueId,
        authorId: access.profile.id,
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
        author: { select: AUTHOR_SELECT },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (e: any) {
    console.error("[espn posts POST] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
