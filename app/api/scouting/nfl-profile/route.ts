import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

const CFBD_KEY = process.env.CFBD_API_KEY ?? "";
const CFBD_BASE = "https://api.collegefootballdata.com";
const CURRENT_YEAR = 2026;

// ─── Shared process-level caches ──────────────────────────────────────────────

let fcCache: { data: any[]; expiry: number } | null = null;
const cfbdCache: Record<string, { data: any[]; expiry: number }> = {};

async function fetchFC(): Promise<any[]> {
  const now = Date.now();
  if (fcCache && now < fcCache.expiry) return fcCache.data;
  const res = await fetch(
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&ppr=1",
    { headers: { "User-Agent": "FantasyHub/1.0" }, signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) throw new Error(`FantasyCalc: ${res.status}`);
  const data = await res.json();
  fcCache = { data, expiry: now + 6 * 60 * 60 * 1000 };
  return data;
}

async function cfbdGet(path: string): Promise<any[]> {
  const now = Date.now();
  if (cfbdCache[path] && now < cfbdCache[path].expiry) return cfbdCache[path].data;
  const res = await fetch(`${CFBD_BASE}${path}`, {
    headers: { Authorization: `Bearer ${CFBD_KEY}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`CFBD ${path}: ${res.status}`);
  const data = await res.json();
  cfbdCache[path] = { data, expiry: now + 24 * 60 * 60 * 1000 };
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

function formatHeight(inches: number | null | undefined): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${Math.round(inches % 12)}"`;
}

export async function GET(req: NextRequest) {
  const sleeperId = req.nextUrl.searchParams.get("sleeperId");
  if (!sleeperId) return NextResponse.json({ error: "Missing sleeperId" }, { status: 400 });

  try {
    // 1. Sleeper player from DB
    const sleeperRow = await prisma.sleeperPlayer.findUnique({
      where: { id: sleeperId },
      select: { full_name: true, rawJson: true },
    });
    const raw = (sleeperRow?.rawJson ?? {}) as Record<string, unknown>;
    const playerName = sleeperRow?.full_name ?? (raw.full_name as string | null) ?? "";
    const yearsExp = (raw.years_exp as number | null) ?? null;
    const classYear = yearsExp !== null ? CURRENT_YEAR - yearsExp : null;

    // 2. FantasyCalc — find this player's dynasty data
    const fcData = await fetchFC().catch(() => []);
    const fcEntry = fcData.find((e: any) => e?.player?.sleeperId === sleeperId);

    // 3. CFBD draft picks for their class year
    let draftPick: {
      round: number; pick: number; overall: number;
      nflTeam: string; collegeTeam: string | null;
      preDraftRanking: number | null; preDraftGrade: number | null;
    } | null = null;

    if (classYear && classYear >= 2020 && classYear <= CURRENT_YEAR) {
      const picks = await cfbdGet(`/draft/picks?year=${classYear}`).catch(() => []);
      const normalizedTarget = normalizeName(playerName);
      const found = picks.find(
        (p: any) => normalizeName(p.name as string) === normalizedTarget
      );
      if (found) {
        draftPick = {
          round:            found.round,
          pick:             found.pick,
          overall:          found.overall,
          nflTeam:          found.nflTeam,
          collegeTeam:      found.collegeTeam ?? null,
          preDraftRanking:  found.preDraftRanking ?? null,
          preDraftGrade:    found.preDraftGrade ?? null,
        };
      }
    }

    // 4. Bio from rawJson
    const heightInches = raw.height as number | null | undefined;

    return NextResponse.json({
      classYear,
      yearsExp,
      value:          fcEntry?.value ?? null,
      trend30Day:     fcEntry?.trend30Day ?? fcEntry?.overallTrend ?? null,
      redraftValue:   fcEntry?.redraftValue ?? null,
      tier:           fcEntry?.maybeTier ?? null,
      draftPick,
      bio: {
        height:     formatHeight(heightInches),
        weight:     (raw.weight as number | null) ?? null,
        college:    (raw.college as string | null) ?? null,
        birthDate:  (raw.birth_date as string | null) ?? null,
        jerseyNum:  (raw.number as number | string | null) ?? null,
        status:     (raw.status as string | null) ?? null,
        injStatus:  (raw.injury_status as string | null) ?? null,
        depthOrder: (raw.depth_chart_order as number | null) ?? null,
      },
    });
  } catch (e: any) {
    console.error("[nfl-profile]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
