import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";

type RouteContext = { params: Promise<{ hubLeagueId: string }> };


const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function fetchLeague(leagueId: string): Promise<any | null> {
  try {
    const res = await fetch(`${SLEEPER_BASE}/league/${leagueId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * GET /api/hub-leagues/[hubLeagueId]/sleeper-history
 *
 * Traverses the Sleeper `previous_league_id` chain backward from every
 * HubLeagueSeason linked to this hub league, discovering all historical
 * seasons. Newly discovered seasons are auto-upserted into HubLeagueSeason
 * so the compute route can find them.
 *
 * Returns: { seasons: { sleeperLeagueId, season, sleeperName }[] }
 * sorted newest → oldest.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await ctx.params;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: {
          ownerId: true,
          seasons: { select: { sleeperLeagueId: true, season: true, sleeperName: true } },
          members: { select: { profileId: true } },
        },
      }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });

    const isOwner = profile.id === hubLeague.ownerId;
    const isMember = hubLeague.members.some((m) => m.profileId === profile.id);
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (hubLeague.seasons.length === 0) {
      return NextResponse.json({ seasons: [] });
    }

    // Collect all already-known Sleeper league IDs to avoid re-fetching
    const knownSeasons = new Map<string, string>(
      hubLeague.seasons.map((s) => [s.sleeperLeagueId, s.season])
    );

    // Discovered seasons: leagueId → { season, name }
    const discovered = new Map<string, { season: string; sleeperName: string }>(
      hubLeague.seasons.map((s) => [
        s.sleeperLeagueId,
        { season: s.season, sleeperName: s.sleeperName ?? "" },
      ])
    );

    // Walk backward through previous_league_id from each known season.
    // We track visited IDs to avoid infinite loops / re-fetching.
    const visited = new Set<string>(discovered.keys());

    // Start from the most recent known league (highest year)
    const sortedStart = [...hubLeague.seasons].sort(
      (a, b) => Number(b.season) - Number(a.season)
    );

    for (const { sleeperLeagueId: startId } of sortedStart) {
      // Fetch the start league to get its previous_league_id
      const startLeague = await fetchLeague(startId);
      if (!startLeague) continue;

      let prevId: string | null = startLeague.previous_league_id ?? null;

      while (prevId && !visited.has(prevId)) {
        visited.add(prevId);

        const league = await fetchLeague(prevId);
        if (!league) break;

        const seasonYear: string = String(league.season ?? "");
        const leagueName: string = league.name ?? "";

        if (seasonYear) {
          discovered.set(prevId, { season: seasonYear, sleeperName: leagueName });
        }

        prevId = league.previous_league_id ?? null;
      }
    }

    // Insert any newly discovered seasons into HubLeagueSeason (skip if already exists)
    for (const [sleeperLeagueId, { season, sleeperName }] of discovered.entries()) {
      if (!knownSeasons.has(sleeperLeagueId) && season) {
        const exists = await prisma.hubLeagueSeason.findFirst({
          where: { hubLeagueId, sleeperLeagueId },
          select: { id: true },
        });
        if (!exists) {
          await prisma.hubLeagueSeason.create({
            data: { hubLeagueId, sleeperLeagueId, season, sleeperName },
          }).catch(() => null);
        }
      }
    }

    // Build sorted response (newest first)
    const seasons = Array.from(discovered.entries())
      .map(([sleeperLeagueId, { season, sleeperName }]) => ({
        sleeperLeagueId,
        season,
        sleeperName,
      }))
      .sort((a, b) => Number(b.season) - Number(a.season));

    return NextResponse.json({ seasons });
  } catch (e: any) {
    console.error("[sleeper-history GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
