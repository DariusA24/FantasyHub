import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

// GET /api/espn/debug — returns raw ESPN mUserInfo response for debugging
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { clerkId: userId },
    select: { espnSwid: true, espnS2: true },
  });
  if (!profile?.espnSwid || !profile?.espnS2) {
    return NextResponse.json({ error: "No ESPN credentials saved" }, { status: 400 });
  }

  const cookieHeader = `SWID=${profile.espnSwid}; espn_s2=${profile.espnS2}`;
  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://fantasy.espn.com/",
    Origin: "https://fantasy.espn.com",
    Cookie: cookieHeader,
  };

  const urls = [
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025?view=mUserInfo",
    "https://fantasy.espn.com/apis/v3/games/ffl/seasons/2025?view=mUserInfo",
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/0?view=mUserInfo",
  ];

  const results: Record<string, unknown> = {};

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
      const text = await res.text();
      results[url] = {
        status: res.status,
        bodyPreview: text.slice(0, 2000),
      };
    } catch (e) {
      results[url] = { error: String(e) };
    }
  }

  return NextResponse.json(results);
}
