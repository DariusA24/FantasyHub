import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let cached: { data: NflState; expiry: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 hour — week only changes once a week

type NflState = {
  week: number;
  display_week: number;
  season: string;
  season_type: string;
};

export async function GET() {
  const now = Date.now();
  if (cached && now < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch("https://api.sleeper.app/v1/state/nfl", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Sleeper state error: ${res.status}`);
    const data: NflState = await res.json();
    cached = { data, expiry: now + TTL };
    return NextResponse.json(data);
  } catch (e: any) {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 502 });
  }
}
