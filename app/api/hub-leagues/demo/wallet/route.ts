import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ wallet: { id: "demo-wallet", balance: 10 } });
}
