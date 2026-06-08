import { NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: { playerId: string } }
) {
  const { playerId } = context.params;

  if (!playerId) {
    return NextResponse.json(
      { error: "Missing playerId" },
      { status: 400 }
    );
  }

  try {
    const player = await prisma.sleeperPlayer.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(player, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", message: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
