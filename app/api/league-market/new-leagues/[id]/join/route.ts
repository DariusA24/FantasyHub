import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ id: string }> };

const PROFILE_SELECT = { id: true, username: true, firstName: true, lastName: true, profileImage: true } as const;

// POST /api/league-market/new-leagues/[id]/join
// Toggles membership: joins if not a member, leaves if already a member.
// Creator cannot leave their own post.
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id: postId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where:  { clerkId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const post = await prisma.leagueQueuePost.findUnique({
      where:   { id: postId },
      include: { members: { include: { profile: { select: PROFILE_SELECT } }, orderBy: { joinedAt: "asc" } } },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const isCreator  = post.creatorId === profile.id;
    const membership = post.members.find((m) => m.profileId === profile.id);

    if (membership) {
      // Leave — creator cannot leave
      if (isCreator) return NextResponse.json({ error: "Commissioner cannot leave their own queue" }, { status: 400 });
      await prisma.leagueQueueMember.delete({ where: { id: membership.id } });
    } else {
      // Join — check capacity
      if (post.members.length >= post.teamCount) {
        return NextResponse.json({ error: "This league queue is already full" }, { status: 409 });
      }
      await prisma.leagueQueueMember.create({ data: { postId, profileId: profile.id } });
    }

    // Re-fetch updated post and sync status
    const updated = await prisma.leagueQueuePost.findUnique({
      where:   { id: postId },
      include: { members: { include: { profile: { select: PROFILE_SELECT } }, orderBy: { joinedAt: "asc" } } },
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newStatus = updated.members.length >= updated.teamCount ? "full" : "open";
    if (newStatus !== updated.status) {
      await prisma.leagueQueuePost.update({ where: { id: postId }, data: { status: newStatus } });
    }

    const hasJoined   = updated.members.some((m) => m.profileId === profile.id);
    const memberCount = updated.members.length;
    const spotsLeft   = Math.max(0, updated.teamCount - memberCount);
    const members     = updated.members.map((m) => ({
      profileId:    m.profile.id,
      username:     m.profile.username,
      firstName:    m.profile.firstName,
      lastName:     m.profile.lastName,
      profileImage: m.profile.profileImage,
      joinedAt:     m.joinedAt.toISOString(),
    }));

    return NextResponse.json({ hasJoined, memberCount, spotsLeft, status: newStatus, members });
  } catch (e: any) {
    console.error("[queue join]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
