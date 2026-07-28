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

function serialize(listing: any, myProfileId: number | null) {
  return {
    id: listing.id,
    type: listing.type,
    sleeperLeagueId: listing.sleeperLeagueId,
    openSpotName: listing.openSpotName,
    leagueName: listing.leagueName,
    platform: listing.platform,
    format: listing.format,
    scoring: listing.scoring,
    teamCount: listing.teamCount,
    entryFee: listing.entryFee,
    spotsAvailable: listing.spotsAvailable,
    record: listing.record,
    standingPosition: listing.standingPosition,
    description: listing.description,
    contact: listing.contact,
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
    creator: {
      profileId: listing.creator.id,
      username: listing.creator.username,
      firstName: listing.creator.firstName,
      lastName: listing.creator.lastName,
      profileImage: listing.creator.profileImage,
    },
    isCreator: myProfileId !== null && listing.creator.id === myProfileId,
  };
}

// Pull the numeric Sleeper league id out of a raw id or a sleeper.com URL.
function parseSleeperLeagueId(input: string): string | null {
  const raw = String(input).trim();
  const fromUrl = raw.match(/leagues?\/(\d{6,25})/i)?.[1];
  const bare = raw.match(/^\d{6,25}$/)?.[0];
  return fromUrl ?? bare ?? null;
}

// GET /api/league-market/listings — public, newest-first open listings
export async function GET(_req: NextRequest) {
  try {
    let myProfileId: number | null = null;
    try {
      const user = await getAuthUser();
      if (user) {
        const p = await prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } });
        myProfileId = p?.id ?? null;
      }
    } catch {
      /* unauthenticated — fine */
    }

    const listings = await prisma.leagueMarketListing.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      include: { creator: { select: PROFILE_SELECT } },
    });

    return NextResponse.json({ listings: listings.map((l) => serialize(l, myProfileId)) });
  } catch (e: any) {
    console.error("[market listings GET]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}

// POST /api/league-market/listings — auth required
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { clerkId: user.id },
      select: PROFILE_SELECT,
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const {
      type, platform, format, scoring, entryFee, description, contact,
      spotsAvailable, record, standingPosition, openSpotName,
    } = body;
    let { leagueName, teamCount, sleeperLeagueId } = body;

    if (!type || !platform || !format || !scoring || !description?.trim() || !contact?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (type !== "open-spot" && type !== "want-out") {
      return NextResponse.json({ error: "Invalid listing type" }, { status: 400 });
    }

    // Validate + enrich from Sleeper when a league is linked
    if (sleeperLeagueId) {
      const id = parseSleeperLeagueId(sleeperLeagueId);
      if (!id) {
        return NextResponse.json({ error: "That doesn't look like a Sleeper league ID or link" }, { status: 400 });
      }
      const res = await fetch(`https://api.sleeper.app/v1/league/${id}`, {
        next: { revalidate: 300 },
      } as RequestInit);
      const league = res.ok ? await res.json() : null;
      if (!league?.league_id) {
        return NextResponse.json({ error: "Couldn't find a public Sleeper league with that ID" }, { status: 400 });
      }
      sleeperLeagueId = id;
      if (!leagueName?.trim()) leagueName = league.name ?? "Sleeper League";
      if (!teamCount) teamCount = league.total_rosters ?? null;
    }

    if (!leagueName?.trim() || !teamCount) {
      return NextResponse.json({ error: "League name and team count are required" }, { status: 400 });
    }

    const listing = await prisma.leagueMarketListing.create({
      data: {
        creatorId: profile.id,
        type,
        sleeperLeagueId: sleeperLeagueId || null,
        openSpotName: type === "open-spot" && openSpotName ? String(openSpotName).trim() : null,
        leagueName: leagueName.trim(),
        platform,
        format,
        scoring,
        teamCount: Number(teamCount),
        entryFee: entryFee ? Number(entryFee) : null,
        spotsAvailable: type === "open-spot" && spotsAvailable ? Number(spotsAvailable) : null,
        record: type === "want-out" ? record?.trim() || null : null,
        standingPosition: type === "want-out" && standingPosition ? Number(standingPosition) : null,
        description: description.trim(),
        contact: contact.trim(),
      },
      include: { creator: { select: PROFILE_SELECT } },
    });

    return NextResponse.json({ listing: serialize(listing, profile.id) }, { status: 201 });
  } catch (e: any) {
    console.error("[market listings POST]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
