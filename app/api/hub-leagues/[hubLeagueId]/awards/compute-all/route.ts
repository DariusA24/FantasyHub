import { NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { computeAwardsForSeason } from "@/utils/computeLeagueAwards";
import { computeSeasonStatsForSeason } from "@/utils/computeSeasonStats";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function fetchSleeperLeague(leagueId: string): Promise<any | null> {
  try {
    const res = await fetch(`${SLEEPER_BASE}/league/${leagueId}`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/**
 * POST /api/hub-leagues/[hubLeagueId]/awards/compute-all
 *
 * Owner-only. Traverses the full Sleeper previous_league_id chain from every
 * known season, auto-saves newly discovered seasons to HubLeagueSeason, then
 * computes awards for every season.
 *
 * Intended to be called once after hub league creation, and again at the end
 * of each season to add the newest season's awards.
 */
export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({
        where: { id: hubLeagueId },
        select: {
          ownerId: true,
          seasons: { select: { id: true, sleeperLeagueId: true, season: true }, orderBy: { season: "desc" } },
        },
      }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!hubLeague) return NextResponse.json({ error: "Hub league not found" }, { status: 404 });
    if (profile.id !== hubLeague.ownerId) {
      return NextResponse.json({ error: "Only the hub league owner can sync" }, { status: 403 });
    }

    if (hubLeague.seasons.length === 0) {
      return NextResponse.json({ error: "No Sleeper seasons linked to this hub league" }, { status: 400 });
    }

    // ── Traverse Sleeper history to discover all seasons ──────────────────

    const knownIds = new Set(hubLeague.seasons.map((s) => s.sleeperLeagueId));
    const allSeasons = new Map<string, string>( // sleeperLeagueId → season year
      hubLeague.seasons.map((s) => [s.sleeperLeagueId, s.season])
    );
    const visited = new Set<string>(knownIds);

    // Sort known seasons newest → oldest so we start traversal from the most recent
    const sortedKnown = [...hubLeague.seasons].sort(
      (a, b) => Number(b.season) - Number(a.season)
    );

    for (const { sleeperLeagueId: startId } of sortedKnown) {
      const startLeague = await fetchSleeperLeague(startId);
      if (!startLeague) continue;

      let prevId: string | null = startLeague.previous_league_id ?? null;

      while (prevId && !visited.has(prevId)) {
        visited.add(prevId);
        const league = await fetchSleeperLeague(prevId);
        if (!league) break;

        const seasonYear = String(league.season ?? "");
        if (seasonYear) {
          allSeasons.set(prevId, seasonYear);

          // Persist to DB so future computes and the franchise page can find it
          const exists = await prisma.hubLeagueSeason.findFirst({
            where: { hubLeagueId, sleeperLeagueId: prevId },
            select: { id: true },
          });
          if (!exists) {
            await prisma.hubLeagueSeason.create({
              data: {
                hubLeagueId,
                sleeperLeagueId: prevId,
                season: seasonYear,
                sleeperName: league.name ?? null,
              },
            }).catch(() => null);
          }
        }

        prevId = league.previous_league_id ?? null;
      }
    }

    // ── Compute awards for every discovered season ────────────────────────

    const results: { season: string; count: number; error?: string }[] = [];

    for (const [sleeperLeagueId, season] of allSeasons.entries()) {
      try {
        const [awardsResult, statsResult] = await Promise.allSettled([
          computeAwardsForSeason(hubLeagueId, sleeperLeagueId, season),
          computeSeasonStatsForSeason(hubLeagueId, sleeperLeagueId, season),
        ]);

        if (statsResult.status === "rejected") {
          console.error(`[compute-all] season stats ${season} failed:`, (statsResult.reason as any)?.message);
        }

        if (awardsResult.status === "rejected") {
          throw awardsResult.reason;
        }

        results.push({ season, count: awardsResult.value });
      } catch (e: any) {
        // Log but keep going — a bad season shouldn't abort the whole run
        console.error(`[compute-all] season ${season} failed:`, e?.message);
        results.push({ season, count: 0, error: e?.message });
      }
    }

    const totalCount = results.reduce((s, r) => s + r.count, 0);
    return NextResponse.json({ results, totalCount });
  } catch (e: any) {
    console.error("[awards compute-all POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
