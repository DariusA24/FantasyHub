import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/utils/actions";
import { prisma } from "@/utils/db";
import { uploadImage } from "@/utils/supabase";

type RouteContext = { params: Promise<{ hubLeagueId: string }> | { hubLeagueId: string } };

async function resolveParams(ctx: RouteContext) {
  return "then" in (ctx.params as any)
    ? await (ctx.params as Promise<{ hubLeagueId: string }>)
    : (ctx.params as { hubLeagueId: string });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { hubLeagueId } = await resolveParams(ctx);

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, hubLeague] = await Promise.all([
      prisma.profile.findUnique({ where: { clerkId: user.id }, select: { id: true } }),
      prisma.hubLeague.findUnique({ where: { id: hubLeagueId }, select: { ownerId: true } }),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.id !== hubLeague?.ownerId) {
      return NextResponse.json({ error: "Only the league owner can upload photos" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const championId = formData.get("championId") as string | null;

    if (!file || !championId) {
      return NextResponse.json({ error: "Missing file or championId" }, { status: 400 });
    }

    const photoUrl = await uploadImage(file);

    await prisma.hubLeagueChampion.update({
      where: { id: championId },
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (e: any) {
    console.error("[champion upload-photo]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
