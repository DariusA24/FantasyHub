import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/utils/db';
import { getSleeperUserById, getUserLeagues, getLeagueRosters } from '@/utils/sleeperService';

// Single round trip for the home dashboard: profile + Sleeper username +
// leagues + per-league records. Replaces the client-side waterfall of
// /api/profile -> getLinkedSleeperProfileForUser -> getSleeperLeagues ->
// N x getSleeperUserRecordForLeague.
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const season = searchParams.get('season') ?? String(new Date().getFullYear());

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: {
        id: true,
        clerkId: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        profileImage: true,
        bio: true,
        sleeperProfileId: true,
        sleeperProfile: true,
        espnSwid: true,
        espnS2: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    // Strip raw cookie values — only expose a presence boolean
    const { espnSwid, espnS2, ...safeProfile } = profile;
    const profileOut = { ...safeProfile, hasEspnCredentials: !!(espnSwid && espnS2) };

    if (!profile.sleeperProfileId) {
      return NextResponse.json({
        profile: profileOut,
        sleeperUsername: null,
        leagues: [],
        records: {},
      });
    }

    const [sleeperUser, leagues] = await Promise.all([
      getSleeperUserById(profile.sleeperProfileId).catch(() => null),
      getUserLeagues(profile.sleeperProfileId, 'nfl', season).catch(() => [] as any[]),
    ]);

    const records: Record<string, { wins: number; losses: number; ties: number }> = {};
    await Promise.all(
      (leagues ?? []).map(async (lg: any) => {
        try {
          const rosters = await getLeagueRosters(lg.league_id);
          const myRoster = Array.isArray(rosters)
            ? rosters.find((r: any) => r.owner_id === profile.sleeperProfileId)
            : null;
          records[lg.league_id] = {
            wins: Number(myRoster?.settings?.wins ?? myRoster?.wins ?? 0),
            losses: Number(myRoster?.settings?.losses ?? myRoster?.losses ?? 0),
            ties: Number(myRoster?.settings?.ties ?? myRoster?.ties ?? 0),
          };
        } catch {
          records[lg.league_id] = { wins: 0, losses: 0, ties: 0 };
        }
      })
    );

    return NextResponse.json({
      profile: profileOut,
      sleeperUsername: sleeperUser?.username ?? sleeperUser?.display_name ?? null,
      leagues: leagues ?? [],
      records,
    });
  } catch (err) {
    console.error('Error in /api/dashboard:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}