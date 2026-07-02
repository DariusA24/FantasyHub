import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

export const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  profileImage: true,
} as const;

// "Membership" for an ESPN league blog = the user has synced this league to
// their profile (an EspnLeague row exists for any season).
export async function requireEspnLeagueAccess(leagueId: string) {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await prisma.profile.findUnique({
    where: { clerkId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  const membership = await prisma.espnLeague.findFirst({
    where: { profileId: profile.id, leagueId },
    select: { id: true },
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { profile };
}
