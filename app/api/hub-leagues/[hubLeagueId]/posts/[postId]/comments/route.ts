import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string; postId: string }> };


export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId, postId } = await ctx.params;

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

    const { body } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const comment = await prisma.hubLeaguePostComment.create({
      data: { postId, authorId: profile.id, body: body.trim() },
      select: {
        id: true,
        body: true,
        createdAt: true,
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

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e: any) {
    console.error("[post comment] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
