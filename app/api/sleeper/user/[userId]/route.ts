import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Demo users — return mock data without hitting Sleeper
  const DEMO_USERS: Record<string, { display_name: string; avatar: null }> = {
    "demo-1":  { display_name: "Marcus W.",      avatar: null },
    "demo-2":  { display_name: "Your Team",      avatar: null },
    "demo-3":  { display_name: "Tyler R.",       avatar: null },
    "demo-4":  { display_name: "Jordan P.",      avatar: null },
    "demo-5":  { display_name: "Alex C.",        avatar: null },
    "demo-6":  { display_name: "Ryan M.",        avatar: null },
    "demo-7":  { display_name: "Chris B.",       avatar: null },
    "demo-8":  { display_name: "Sam T.",         avatar: null },
    "demo-9":  { display_name: "Mike F.",        avatar: null },
    "demo-10": { display_name: "Big Play Kevin", avatar: null },
  };
  if (userId in DEMO_USERS) {
    return NextResponse.json(DEMO_USERS[userId]);
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
