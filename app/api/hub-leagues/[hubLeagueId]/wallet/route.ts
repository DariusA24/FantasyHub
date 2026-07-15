import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ hubLeagueId: string }> }
) {
  const resolvedParams = await context.params;

  const hubLeagueId = resolvedParams.hubLeagueId;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const wallet = await prisma.wallet.upsert({
      where: {
        hubLeagueId_profileId: {
          hubLeagueId,
          profileId: profile.id,
        },
      },
      update: {},
      create: {
        hubLeagueId,
        profileId: profile.id,
        balance: 10000,
      },
    });

    return NextResponse.json({ wallet, profileId: profile.id });
  } catch (err) {
    console.error("Error fetching wallet:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
