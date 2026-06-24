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

// GET /api/forum/posts?tag=X&sort=new|hot&cursor=X&limit=20&mine=true
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const tag    = sp.get("tag") ?? undefined;
    const sort   = sp.get("sort") === "hot" ? "hot" : "new";
    const cursor = sp.get("cursor") ?? undefined;
    const limit  = Math.min(parseInt(sp.get("limit") ?? "20", 10), 50);
    const mine   = sp.get("mine") === "true";

    let authorId: number | undefined;
    if (mine) {
      const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      authorId = profile.id;
    }

    const where = {
      ...(tag && VALID_TAGS.includes(tag) ? { tag } : {}),
      ...(authorId !== undefined ? { authorId } : {}),
    };

    const rawPosts = await prisma.forumPost.findMany({
      where,
      orderBy: sort === "new" ? { publishedAt: "desc" } : { publishedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        tag: true,
        title: true,
        excerpt: true,
        readTime: true,
        mediaUrls: true,
        publishedAt: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
        likes: { select: { value: true } },
        _count: { select: { comments: true } },
      },
    });

    const hasMore = rawPosts.length > limit;
    const page = rawPosts.slice(0, limit);

    const posts = page.map(({ likes, _count, ...p }) => {
      const upvotes   = likes.filter((l) => l.value === 1).length;
      const downvotes = likes.filter((l) => l.value === -1).length;
      return { ...p, _count: { likes: upvotes, dislikes: downvotes, comments: _count.comments } };
    });

    // Hot sort: net score desc
    if (sort === "hot") {
      posts.sort((a, b) => (b._count.likes - b._count.dislikes) - (a._count.likes - a._count.dislikes));
    }

    return NextResponse.json({ posts, hasMore, nextCursor: hasMore ? page[page.length - 1].id : null });
  } catch (e: any) {
    console.error("[forum/posts GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST /api/forum/posts
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { tag, title, body, mediaUrls } = await req.json();

    if (!VALID_TAGS.includes(tag)) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "title and body are required" }, { status: 400 });

    const safeMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls.filter((u: unknown) => typeof u === "string").slice(0, 4)
      : [];

    const post = await prisma.forumPost.create({
      data: {
        authorId: profile.id,
        tag,
        title: title.trim(),
        body: body.trim(),
        excerpt: deriveExcerpt(body),
        readTime: calcReadTime(body),
        mediaUrls: safeMediaUrls,
      },
      select: {
        id: true, tag: true, title: true, excerpt: true, readTime: true, publishedAt: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (e: any) {
    console.error("[forum/posts POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
