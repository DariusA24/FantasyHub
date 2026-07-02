import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type Ctx = { params: Promise<{ postId: string }> | { postId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ postId: string }>)
    : (ctx.params as { postId: string });
}

// POST /api/forum/posts/[postId]/like  { value: 1 | -1 }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { postId } = await rp(ctx);
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { value } = await req.json();
    if (value !== 1 && value !== -1) return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });

    const existing = await prisma.forumPostLike.findUnique({
      where: { postId_profileId: { postId, profileId: profile.id } },
    });

    if (existing?.value === value) {
      // Toggle off
      await prisma.forumPostLike.delete({ where: { postId_profileId: { postId, profileId: profile.id } } });
    } else {
      await prisma.forumPostLike.upsert({
        where: { postId_profileId: { postId, profileId: profile.id } },
        create: { postId, profileId: profile.id, value },
        update: { value },
      });
    }

    const all = await prisma.forumPostLike.findMany({ where: { postId }, select: { profileId: true, value: true } });
    const myLike = all.find((l) => l.profileId === profile.id);

    return NextResponse.json({
      likes:      all.filter((l) => l.value === 1).length,
      dislikes:   all.filter((l) => l.value === -1).length,
      myReaction: (myLike?.value ?? null) as 1 | -1 | null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
