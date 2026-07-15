import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ playerId: string; messageId: string }> };

async function getProfileId(clerkId: string) {
  const profile = await prisma.profile.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// DELETE /api/players/[playerId]/chat/[messageId]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await ctx.params;
    const profileId = await getProfileId(user.id);
    if (!profileId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const message = await prisma.playerChat.findUnique({
      where: { id: messageId },
      select: { authorId: true },
    });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (message.authorId !== profileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.playerChat.delete({ where: { id: messageId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// PATCH /api/players/[playerId]/chat/[messageId]  { body: string }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId } = await ctx.params;
    const profileId = await getProfileId(user.id);
    if (!profileId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const message = await prisma.playerChat.findUnique({
      where: { id: messageId },
      select: { authorId: true },
    });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (message.authorId !== profileId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
    if (body.trim().length > 500) return NextResponse.json({ error: "Message too long (max 500 chars)" }, { status: 400 });

    const updated = await prisma.playerChat.update({
      where: { id: messageId },
      data: { body: body.trim() },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, username: true, profileImage: true },
        },
      },
    });

    return NextResponse.json({ message: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
