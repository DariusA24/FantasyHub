import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string; postId: string }> | { hubLeagueId: string; postId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string; postId: string }>)
    : (ctx.params as { hubLeagueId: string; postId: string });
}

// POST — toggle like (1) or dislike (-1)
// Same value again → removes the reaction
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId, postId } = await resolveParams(ctx);

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

    const { value } = await req.json();
    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
    }

    const existing = await prisma.hubLeaguePostLike.findUnique({
      where: { postId_profileId: { postId, profileId: profile.id } },
    });

    if (existing) {
      if (existing.value === value) {
        // Same reaction → remove it (toggle off)
        await prisma.hubLeaguePostLike.delete({
          where: { postId_profileId: { postId, profileId: profile.id } },
        });
      } else {
        // Different reaction → switch it
        await prisma.hubLeaguePostLike.update({
          where: { postId_profileId: { postId, profileId: profile.id } },
          data: { value },
        });
      }
    } else {
      await prisma.hubLeaguePostLike.create({
        data: { postId, profileId: profile.id, value },
      });
    }

    // Return fresh counts
    const allLikes = await prisma.hubLeaguePostLike.findMany({
      where: { postId },
      select: { value: true, profileId: true },
    });

    const likes    = allLikes.filter((l) => l.value === 1).length;
    const dislikes = allLikes.filter((l) => l.value === -1).length;
    const myReaction = allLikes.find((l) => l.profileId === profile.id)?.value ?? null;

    return NextResponse.json({ likes, dislikes, myReaction });
  } catch (e: any) {
    console.error("[post like] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
