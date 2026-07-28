import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";
import { requireEspnLeagueAccess } from "../posts/_access";

type RouteContext = { params: Promise<{ leagueId: string }> };

// PATCH /api/espn/league/[leagueId]/team-bio — set a franchise's bio.
// Editable by anyone who has synced this ESPN league.
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { leagueId } = await ctx.params;
    const access = await requireEspnLeagueAccess(leagueId);
    if ("error" in access) return access.error;

    const body = await req.json();
    const memberId = String(body.memberId ?? "");
    const bio = String(body.bio ?? "").trim();

    if (!memberId) {
      return NextResponse.json({ error: "Missing franchise id" }, { status: 400 });
    }

    // You may only edit your own franchise (memberId must be your ESPN SWID)
    const me = await prisma.profile.findUnique({
      where: { id: access.profile.id },
      select: { espnSwid: true },
    });
    const norm = (s?: string | null) => (s ?? "").replace(/[{}]/g, "").toUpperCase();
    if (!me?.espnSwid || norm(me.espnSwid) !== norm(memberId)) {
      return NextResponse.json({ error: "You can only edit your own franchise" }, { status: 403 });
    }

    if (!bio) {
      await prisma.espnFranchiseBio.deleteMany({ where: { leagueId, memberId } });
      return NextResponse.json({ bio: "" });
    }

    const saved = await prisma.espnFranchiseBio.upsert({
      where: { leagueId_memberId: { leagueId, memberId } },
      create: { leagueId, memberId, bio },
      update: { bio },
    });

    return NextResponse.json({ bio: saved.bio });
  } catch (e: any) {
    console.error("[espn franchise-bio PATCH]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
