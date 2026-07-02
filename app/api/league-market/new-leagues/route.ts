import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

const PROFILE_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  profileImage: true,
} as const;

const MEMBER_INCLUDE = {
  orderBy: { joinedAt: "asc" as const },
  include: { profile: { select: PROFILE_SELECT } },
};

function serializePost(post: any, myProfileId: number | null) {
  const memberCount = post.members.length;
  const spotsLeft   = Math.max(0, post.teamCount - memberCount);
  return {
    id:          post.id,
    leagueName:  post.leagueName,
    platform:    post.platform,
    format:      post.format,
    scoring:     post.scoring,
    teamCount:   post.teamCount,
    entryFee:    post.entryFee,
    description: post.description,
    draftDate:   post.draftDate,
    status:      post.status,
    createdAt:   post.createdAt.toISOString(),
    creator: {
      profileId:    post.creator.id,
      username:     post.creator.username,
      firstName:    post.creator.firstName,
      lastName:     post.creator.lastName,
      profileImage: post.creator.profileImage,
    },
    members: post.members.map((m: any) => ({
      profileId:    m.profile.id,
      username:     m.profile.username,
      firstName:    m.profile.firstName,
      lastName:     m.profile.lastName,
      profileImage: m.profile.profileImage,
      joinedAt:     m.joinedAt.toISOString(),
    })),
    memberCount,
    spotsLeft,
    isCreator: myProfileId !== null && post.creator.id === myProfileId,
    hasJoined:  myProfileId !== null && post.members.some((m: any) => m.profile.id === myProfileId),
  };
}

// GET /api/league-market/new-leagues
// Public — returns open/full queue posts newest-first.
export async function GET(_req: NextRequest) {
  try {
    let myProfileId: number | null = null;
    try {
      const user = await getAuthUser();
      if (user) {
        const p = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
        myProfileId = p?.id ?? null;
      }
    } catch { /* unauthenticated — fine */ }

    const posts = await prisma.leagueQueuePost.findMany({
      where:   { status: { in: ["open", "full"] } },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: PROFILE_SELECT },
        members: MEMBER_INCLUDE,
      },
    });

    return NextResponse.json({ posts: posts.map((p) => serializePost(p, myProfileId)) });
  } catch (e: any) {
    console.error("[queue GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST /api/league-market/new-leagues
// Auth required. Creates a queue post and auto-adds the creator as first member.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where:  { clerkId: user.id },
      select: PROFILE_SELECT,
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const { leagueName, platform, format, scoring, teamCount, entryFee, description, draftDate } = body;

    if (!leagueName?.trim() || !platform || !format || !scoring || !teamCount || !description?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const post = await prisma.leagueQueuePost.create({
      data: {
        creatorId:   profile.id,
        leagueName:  leagueName.trim(),
        platform,
        format,
        scoring,
        teamCount:   Number(teamCount),
        entryFee:    entryFee ? Number(entryFee) : null,
        description: description.trim(),
        draftDate:   draftDate?.trim() || null,
        members: {
          create: { profileId: profile.id },
        },
      },
      include: {
        creator: { select: PROFILE_SELECT },
        members: MEMBER_INCLUDE,
      },
    });

    return NextResponse.json({ post: serializePost(post, profile.id) }, { status: 201 });
  } catch (e: any) {
    console.error("[queue POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
