import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await context.params;

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}/users`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Sleeper API error: ${res.status}` },
        { status: 502 }
      );
    }

    const users = await res.json();
    return NextResponse.json(users);
  } catch (e: any) {
    console.error("[sleeper/league/users] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
