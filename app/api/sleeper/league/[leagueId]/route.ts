import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ leagueId: string }> | { leagueId: string } }
) {
  const params =
    "then" in (context.params as any)
      ? await (context.params as Promise<{ leagueId: string }>)
      : (context.params as { leagueId: string });

  const { leagueId } = params;

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/league/${encodeURIComponent(leagueId)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Sleeper API error: ${res.status}` },
        { status: 502 }
      );
    }

    const league = await res.json();
    return NextResponse.json(league);
  } catch (e: any) {
    console.error("[sleeper/league] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
