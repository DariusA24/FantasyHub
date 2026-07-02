import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };

const SLEEPER = "https://api.sleeper.app/v1";

async function sleeperGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${SLEEPER}${path}`, { cache: "no-store" });
    return r.ok ? (r.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

interface SLeague  { settings: { playoff_week_start: number } }
interface SRoster  { roster_id: number; owner_id: string | null; settings: { wins: number; losses: number; ties: number } }
interface SUser    { user_id: string; display_name: string; metadata?: { team_name?: string } }
interface SMatchup { roster_id: number; points: number; matchup_id: number | null }

// POST /api/hub-leagues/[hubLeagueId]/champions/sync
// Owner-only. Reads every linked HubLeagueSeason, calls Sleeper to find each
// season's playoff champion, and upserts HubLeagueChampion rows.
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: { ownerId: true, seasons: { select: { sleeperLeagueId: true, season: true } } },
      }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!hubLeague) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (profile.id !== hubLeague.ownerId) {
      return NextResponse.json({ error: "Owner only" }, { status: 403 });
    }

    if (hubLeague.seasons.length === 0) {
      return NextResponse.json({ synced: 0, results: [] });
    }

    type SyncResult = { season: string; winnerName: string | null; skipped: boolean; reason?: string };
    const results: SyncResult[] = [];

    for (const { sleeperLeagueId, season } of hubLeague.seasons) {
      try {
        const [leagueInfo, rosters, users] = await Promise.all([
          sleeperGet<SLeague>(`/league/${sleeperLeagueId}`),
          sleeperGet<SRoster[]>(`/league/${sleeperLeagueId}/rosters`),
          sleeperGet<SUser[]>(`/league/${sleeperLeagueId}/users`),
        ]);

        if (!leagueInfo || !rosters || !users) {
          results.push({ season, winnerName: null, skipped: true, reason: "Sleeper API unavailable" });
          continue;
        }

        const playoffStart = leagueInfo.settings.playoff_week_start ?? 15;

        // Fetch weeks from 18 down to playoff start in parallel, newest first
        const weekNums = Array.from({ length: 18 - playoffStart + 1 }, (_, i) => 18 - i);
        const weekData = await Promise.all(
          weekNums.map(async (w) => ({
            week: w,
            matchups: (await sleeperGet<SMatchup[]>(`/league/${sleeperLeagueId}/matchups/${w}`)) ?? [],
          }))
        );

        // Championship game = matchup_id 1 with exactly 2 entries and at least one non-zero score
        let championRosterId: number | null = null;
        for (const { matchups } of weekData) {
          const champGame = matchups.filter((m) => m.matchup_id === 1);
          if (
            champGame.length === 2 &&
            (champGame[0].points > 0 || champGame[1].points > 0)
          ) {
            const [a, b] = champGame;
            championRosterId = a.points >= b.points ? a.roster_id : b.roster_id;
            break;
          }
        }

        if (championRosterId === null) {
          results.push({ season, winnerName: null, skipped: true, reason: "No completed championship found (season may be in progress)" });
          continue;
        }

        const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]));
        const userMap   = new Map(users.map((u) => [u.user_id, u]));

        const championRoster = rosterMap.get(championRosterId);
        const { wins = 0, losses = 0, ties = 0 } = championRoster?.settings ?? {};
        const ownerId    = championRoster?.owner_id ?? "";
        const u          = userMap.get(ownerId);
        const winnerName = u?.display_name ?? ownerId;
        const teamName   = u?.metadata?.team_name ?? null;

        await prisma.hubLeagueChampion.upsert({
          where:  { hubLeagueId_season: { hubLeagueId, season } },
          create: { hubLeagueId, season, winnerName, teamName, wins, losses, ties, notes: null, variant: "classic" },
          update: { winnerName, teamName, wins, losses, ties },
        });

        results.push({ season, winnerName, skipped: false });
      } catch (e: any) {
        results.push({ season, winnerName: null, skipped: true, reason: e?.message ?? "Unknown" });
      }
    }

    const synced = results.filter((r) => !r.skipped).length;
    return NextResponse.json({ synced, results });
  } catch (e: any) {
    console.error("[champions sync]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
