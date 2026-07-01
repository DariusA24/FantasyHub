import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ athleteId: string }> | { athleteId: string } };
async function rp(ctx: Ctx) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ athleteId: string }>)
    : (ctx.params as { athleteId: string });
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

// GET /api/prospects/[athleteId]/notes
// Returns public notes + caller's own private notes
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { athleteId } = await rp(ctx);

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    const notes = await prisma.prospectScoutingNote.findMany({
      where: {
        athleteId,
        OR: [
          { isPublic: true },
          // Also return caller's own private notes
          ...(profile ? [{ isPublic: false, authorId: profile.id }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: NOTE_SELECT,
    });

    return NextResponse.json({ notes, currentProfileId: profile?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST /api/prospects/[athleteId]/notes  { body, isPublic }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { athleteId } = await rp(ctx);

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { body, isPublic = true } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
    if (body.trim().length > 2000) return NextResponse.json({ error: "Note too long (max 2000 chars)" }, { status: 400 });

    const note = await prisma.prospectScoutingNote.create({
      data: { athleteId, authorId: profile.id, body: body.trim(), isPublic: Boolean(isPublic) },
      select: NOTE_SELECT,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
