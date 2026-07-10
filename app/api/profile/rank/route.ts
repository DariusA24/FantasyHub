import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { computeLeagueShelfRank } from "@/utils/computeLeagueShelfRank";

// GET /api/profile/rank?sleeperUserId=XXX
// Returns tier, score, and seasons for the given Sleeper user.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sleeperUserId = req.nextUrl.searchParams.get("sleeperUserId");
    if (!sleeperUserId) {
      return NextResponse.json({ error: "sleeperUserId is required" }, { status: 400 });
    }

    const rank = await computeLeagueShelfRank(sleeperUserId);
    return NextResponse.json(rank);
  } catch (e: any) {
    console.error("[profile/rank GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
