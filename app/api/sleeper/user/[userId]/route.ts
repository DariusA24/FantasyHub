import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> | { userId: string } }
) {
  const params =
    "then" in (context.params as any)
      ? await (context.params as Promise<{ userId: string }>)
      : (context.params as { userId: string });

  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Sleeper API error: ${res.status}` },
        { status: 502 }
      );
    }

    const user = await res.json();
    return NextResponse.json(user);
  } catch (e: any) {
    console.error("[sleeper/user] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
