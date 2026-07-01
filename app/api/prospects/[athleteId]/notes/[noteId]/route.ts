import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ athleteId: string; noteId: string }> | { athleteId: string; noteId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ athleteId: string; noteId: string }>)
    : (ctx.params as { athleteId: string; noteId: string });
}

const NOTE_SELECT = {
  id: true,
  body: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      profileImage: true,
    },
  },
} as const;

// PATCH /api/prospects/[athleteId]/notes/[noteId]  { body?, isPublic? }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { noteId } = await rp(ctx);

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const existing = await prisma.prospectScoutingNote.findUnique({ where: { id: noteId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.authorId !== profile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { body, isPublic } = await req.json();
    if (body !== undefined && !body?.trim()) return NextResponse.json({ error: "body cannot be empty" }, { status: 400 });
    if (body?.trim().length > 2000) return NextResponse.json({ error: "Note too long" }, { status: 400 });

    const note = await prisma.prospectScoutingNote.update({
      where: { id: noteId },
      data: {
        ...(body !== undefined ? { body: body.trim() } : {}),
        ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
      },
      select: NOTE_SELECT,
    });

    return NextResponse.json({ note });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// DELETE /api/prospects/[athleteId]/notes/[noteId]
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { noteId } = await rp(ctx);

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const existing = await prisma.prospectScoutingNote.findUnique({ where: { id: noteId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.authorId !== profile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.prospectScoutingNote.delete({ where: { id: noteId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
