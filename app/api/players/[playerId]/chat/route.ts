import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ playerId: string }> };

// GET /api/players/[playerId]/chat?since=ISO_DATE
// Returns up to 80 messages; `since` returns only messages newer than that timestamp
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { playerId } = await ctx.params;
    const since = req.nextUrl.searchParams.get("since");

    const [profile, messages] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.playerChat.findMany({
        where: {
          playerId,
          ...(since ? { createdAt: { gt: new Date(since) } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take: 80,
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
      }),
    ]);

    return NextResponse.json({ messages, currentProfileId: profile?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST /api/players/[playerId]/chat  { body: string }
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { playerId } = await ctx.params;

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const player = await prisma.sleeperPlayer.findUnique({
      where: { id: playerId },
      select: { id: true },
    });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
    if (body.trim().length > 500) return NextResponse.json({ error: "Message too long (max 500 chars)" }, { status: 400 });

    const message = await prisma.playerChat.create({
      data: { playerId, authorId: profile.id, body: body.trim() },
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

    return NextResponse.json({ message }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
