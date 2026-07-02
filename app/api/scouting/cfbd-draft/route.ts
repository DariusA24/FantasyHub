import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CFBD_KEY = process.env.CFBD_API_KEY ?? "";
const CFBD_BASE = "https://api.collegefootballdata.com";

const cache: Record<string, { data: any; expiry: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function cfbdGet(path: string): Promise<any[]> {
  const now = Date.now();
  if (cache[path] && now < cache[path].expiry) return cache[path].data;

  const res = await fetch(`${CFBD_BASE}${path}`, {
    headers: { Authorization: `Bearer ${CFBD_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`CFBD ${path}: ${res.status}`);
  const data = await res.json();
  cache[path] = { data, expiry: now + CACHE_TTL };
  return data;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// CFBD uses full position names
const SKILL_POSITIONS = new Set([
  "quarterback", "running back", "wide receiver", "tight end",
]);

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "0");
  if (!year) return NextResponse.json({ error: "Missing year" }, { status: 400 });

  try {
    const raw = await cfbdGet(`/draft/picks?year=${year}`);

    const picks = raw
      .filter((p: any) => SKILL_POSITIONS.has((p.position ?? "").toLowerCase()))
      .map((p: any) => ({
        name:               p.name as string,
        normalizedName:     normalizeName(p.name as string),
        round:              p.round as number,
        pick:               p.pick as number,
        overall:            p.overall as number,
        nflTeam:            p.nflTeam as string,
        position:           p.position as string,
        collegeTeam:        (p.collegeTeam as string | null) ?? null,
        collegeAthleteId:   (p.collegeAthleteId as number | null) ?? null,
        preDraftRanking:    (p.preDraftRanking as number | null) ?? null,
        preDraftGrade:      (p.preDraftGrade as number | null) ?? null,
      }));

    return NextResponse.json({ year, picks });
  } catch (e: any) {
    console.error("[cfbd-draft]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
