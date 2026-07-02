import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { requireEspnLeagueAccess, AUTHOR_SELECT } from "../../_access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; postId: string }> },
) {
  try {
    const { leagueId, postId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

    const { body } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const comment = await prisma.hubLeaguePostComment.create({
      data: { postId, authorId: access.profile.id, body: body.trim() },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: AUTHOR_SELECT },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (e: any) {
    console.error("[espn post comment] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
