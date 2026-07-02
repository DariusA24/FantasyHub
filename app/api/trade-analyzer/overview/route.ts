import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

type TradePlayer = {
  name: string;
  position: string;
  value: number;
  age: number | null;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sideA, sideB, isDynasty } = (await req.json()) as {
      sideA: TradePlayer[];
      sideB: TradePlayer[];
      isDynasty: boolean;
    };

    if (!sideA?.length || !sideB?.length) {
      return NextResponse.json({ error: "Both sides must have at least one player" }, { status: 400 });
    }

    const format = isDynasty ? "dynasty" : "redraft";

    const formatSide = (players: TradePlayer[]) =>
      players
        .map((p) => {
          const age = p.age ? ` (age ${p.age})` : "";
          return `- ${p.name} (${p.position}${age}): ${p.value.toLocaleString()} pts`;
        })
        .join("\n");

    const totalA = sideA.reduce((s, p) => s + p.value, 0);
    const totalB = sideB.reduce((s, p) => s + p.value, 0);

    const prompt = `You are a fantasy football expert. Evaluate this ${format} trade concisely.

Side A gives up:
${formatSide(sideA)}
Total: ${totalA.toLocaleString()} pts

Side B gives up:
${formatSide(sideB)}
Total: ${totalB.toLocaleString()} pts

${isDynasty ? "Values reflect dynasty long-term outlook (age matters)." : "Values reflect current-season redraft performance."}

In 2-3 sentences: who wins this trade and why? Mention specific players. Be direct.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    return NextResponse.json({ overview: text });
  } catch (err) {
    console.error("[trade-analyzer/overview]", err);
    return NextResponse.json({ error: "Failed to generate overview" }, { status: 500 });
  }
}
