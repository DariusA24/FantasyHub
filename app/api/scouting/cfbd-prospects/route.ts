import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

const CFBD_KEY = process.env.CFBD_API_KEY ?? "";
const CFBD_BASE = "https://api.collegefootballdata.com";

const cache: Record<string, { data: any[]; expiry: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000;

const ALL_SKILL = new Set(["QB", "RB", "WR", "TE", "ATH"]);

const POS_FILTER: Record<string, Set<string>> = {
  QB:  new Set(["QB"]),
  RB:  new Set(["RB"]),
  WR:  new Set(["WR"]),
  TE:  new Set(["TE"]),
  ATH: new Set(["ATH"]),
  ALL: ALL_SKILL,
};

// Normalize a player name for loose comparison (handles Jr., III, case, etc.)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")          // strip punctuation
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")  // strip suffixes
    .replace(/\s+/g, " ")
    .trim();
}

// Cache the NFL name set per process lifetime (refreshed every 12h)
let nflNamesCache: { set: Set<string>; expiry: number } | null = null;
const NFL_NAME_CACHE_TTL = 12 * 60 * 60 * 1000;

async function getNFLPlayerNames(): Promise<Set<string>> {
  const now = Date.now();
  if (nflNamesCache && now < nflNamesCache.expiry) return nflNamesCache.set;

  // Pull all skill-position players from the Sleeper DB
  const rows = await prisma.sleeperPlayer.findMany({
    where: { position: { in: ["QB", "RB", "WR", "TE"] } },
    select: { full_name: true },
  });

  const set = new Set(
    rows
      .filter((r) => r.full_name)
      .map((r) => normalizeName(r.full_name!))
  );

  nflNamesCache = { set, expiry: now + NFL_NAME_CACHE_TTL };
  return set;
}

async function fetchRecruits(year: number): Promise<any[]> {
  const key = `cfbd-${year}`;
  const now = Date.now();
  if (cache[key] && now < cache[key].expiry) return cache[key].data;

  const url = `${CFBD_BASE}/recruiting/players?year=${year}&classification=HighSchool`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CFBD_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) throw new Error(`CFBD API ${res.status}: ${await res.text().catch(() => "")}`);
  const data: any[] = await res.json();
  cache[key] = { data, expiry: now + CACHE_TTL };
  return data;
}

function formatHeight(inches: number | null): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${Math.round(inches % 12)}"`;
}

function recruitYearFromDraftYear(nflDraftYear: number): number {
  return nflDraftYear - 4;
}

function collegeYearLabel(recruitYear: number): string {
  const yearsIn = 2026 - recruitYear;
  if (yearsIn === 0) return "Entering Freshmen";
  if (yearsIn === 1) return "Entering Sophomores";
  if (yearsIn === 2) return "Entering Juniors";
  if (yearsIn === 3) return "Entering Seniors";
  return `${yearsIn}th Year`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const nflDraftYear = parseInt(sp.get("nflDraftYear") ?? "2027");
  const position = sp.get("position") ?? "ALL";

  const recruitYear = recruitYearFromDraftYear(nflDraftYear);
  const allowedPos = POS_FILTER[position] ?? ALL_SKILL;

  try {
    const [all, nflNames] = await Promise.all([
      fetchRecruits(recruitYear),
      getNFLPlayerNames(),
    ]);

    const skillRecruits = all.filter(
      (r) => r.recruitType === "HighSchool" && allowedPos.has(r.position)
    );

    // Filter out anyone already in the NFL (early declares from prior drafts)
    const stillInCollege = nflNames.size > 0
      ? skillRecruits.filter((r) => !nflNames.has(normalizeName(r.name as string)))
      : skillRecruits;

    const prospects = stillInCollege
      .sort((a, b) => (a.ranking ?? 9999) - (b.ranking ?? 9999))
      .map((r, i) => ({
        id: String(r.id),
        athleteId: r.athleteId ? String(r.athleteId) : null,
        name: r.name as string,
        position: r.position as string,
        highSchool: r.school as string | null,
        committedTo: r.committedTo as string | null,
        city: r.city as string | null,
        state: r.stateProvince as string | null,
        stars: r.stars as number | null,
        rating: r.rating as number | null,
        nationalRank: r.ranking as number | null,
        height: formatHeight(r.height as number | null),
        weight: r.weight as number | null,
        recruitYear,
        nflDraftYear,
        collegeYearLabel: collegeYearLabel(recruitYear),
        rank: i + 1,
      }));

    return NextResponse.json({
      prospects,
      recruitYear,
      collegeYearLabel: collegeYearLabel(recruitYear),
      filtered: skillRecruits.length - stillInCollege.length, // how many were removed
    });
  } catch (e: any) {
    console.error("[cfbd-prospects]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
