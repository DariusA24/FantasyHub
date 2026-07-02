import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { requireEspnLeagueAccess } from "../../_access";

// POST — toggle like (1) or dislike (-1)
// Same value again → removes the reaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; postId: string }> },
) {
  try {
    const { leagueId, postId } = await params;

    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;
    const profileId = access.profile.id;

    const { value } = await req.json();
    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
    }

    const existing = await prisma.hubLeaguePostLike.findUnique({
      where: { postId_profileId: { postId, profileId } },
    });

    if (existing) {
      if (existing.value === value) {
        await prisma.hubLeaguePostLike.delete({
          where: { postId_profileId: { postId, profileId } },
        });
      } else {
        await prisma.hubLeaguePostLike.update({
          where: { postId_profileId: { postId, profileId } },
          data: { value },
        });
      }
    } else {
      await prisma.hubLeaguePostLike.create({
        data: { postId, profileId, value },
      });
    }

    const allLikes = await prisma.hubLeaguePostLike.findMany({
      where: { postId },
      select: { value: true, profileId: true },
    });

    const likes    = allLikes.filter((l) => l.value === 1).length;
    const dislikes = allLikes.filter((l) => l.value === -1).length;
    const myReaction = allLikes.find((l) => l.profileId === profileId)?.value ?? null;

    return NextResponse.json({ likes, dislikes, myReaction });
  } catch (e: any) {
    console.error("[espn post like] error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
