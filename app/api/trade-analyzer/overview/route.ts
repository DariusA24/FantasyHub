import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

type TradePlayer = {
  name: string;
  position: string;
  value: number;
  age: number | null;
  tier?: number | null;
  trend?: number;
  redraftValue?: number;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sideA, sideB, isDynasty, numQbs, ppr, waiverA, waiverB } = (await req.json()) as {
      sideA: TradePlayer[];
      sideB: TradePlayer[];
      isDynasty: boolean;
      numQbs?: 1 | 2;
      ppr?: 0 | 0.5 | 1;
      waiverA?: number;
      waiverB?: number;
    };

    if (!sideA?.length || !sideB?.length) {
      return NextResponse.json({ error: "Both sides must have at least one player" }, { status: 400 });
    }

    const format  = isDynasty ? "dynasty" : "redraft";
    const qbNote  = numQbs === 2 ? "Superflex (QBs carry a heavy premium)" : "1QB";
    const scoring = ppr === 1 ? "full PPR" : ppr === 0.5 ? "half PPR" : "standard (non-PPR)";

    const formatPlayer = (p: TradePlayer) => {
      const parts = [
        p.position + (p.age ? `, age ${Math.floor(p.age)}` : "") + (p.tier ? `, tier ${p.tier}` : ""),
      ];
      let line = `- ${p.name} (${parts.join("")}): ${p.value.toLocaleString()} value`;
      if (p.trend) line += `, 30-day trend ${p.trend > 0 ? "+" : ""}${p.trend}`;
      if (isDynasty && p.redraftValue) line += `, redraft value ${p.redraftValue.toLocaleString()}`;
      return line;
    };

    const formatSide = (players: TradePlayer[]) => players.map(formatPlayer).join("\n");

    const totalA = sideA.reduce((s, p) => s + p.value, 0) + (waiverA ?? 0);
    const totalB = sideB.reduce((s, p) => s + p.value, 0) + (waiverB ?? 0);
    const gap    = Math.abs(totalA - totalB);
    const gapPct = Math.max(totalA, totalB) > 0 ? Math.round((gap / Math.max(totalA, totalB)) * 100) : 0;
    const richer = totalA > totalB ? "Side A" : "Side B";

    const waiverNote = waiverA
      ? `\nA waiver adjustment of +${waiverA.toLocaleString()} is included in Side A's total: Side A sends fewer players, so the team receiving them refills its open roster spots from waivers.`
      : waiverB
        ? `\nA waiver adjustment of +${waiverB.toLocaleString()} is included in Side B's total: Side B sends fewer players, so the team receiving them refills its open roster spots from waivers.`
        : "";

    const prompt = `You are an expert fantasy football trade analyst. Evaluate this ${format} trade.

League settings: ${qbNote}, ${scoring} scoring.
Values are FantasyCalc market values (crowd-sourced from real trades). Tier 1 is elite; higher tier numbers are worse.

Side A gives up:
${formatSide(sideA)}
Total: ${totalA.toLocaleString()}

Side B gives up:
${formatSide(sideB)}
Total: ${totalB.toLocaleString()}

Value gap: ${gap.toLocaleString()} (${gapPct}%), ${richer} sends more value.${waiverNote}

Look beyond the raw totals:
- Consolidation premium: in an uneven-numbered trade (e.g. 2-for-1), the side getting the single best player often wins even at a small raw-value deficit, because starting-lineup spots are finite.
${isDynasty
  ? `- Age curves: RBs typically fall off a cliff around age 27, WRs around 30, while QBs and TEs age gracefully. Young ascending players and rookie picks carry extra upside; aging stars carry hidden decline risk that market values can lag on.
- Dynasty vs redraft split: a player whose redraft value far exceeds his dynasty value is a win-now piece; the reverse is a stash.`
  : `- This is redraft: only this season matters. Age and long-term upside are irrelevant; weekly starter reliability and playoff-week schedule matter most.`}
- Momentum: a strongly positive 30-day trend means the market is still catching up (breakout, role change); a negative trend can signal injury or a lost role.
- Tier gaps matter more than small point gaps: a tier-1 player for two tier-3 players is usually a win for the tier-1 side.

Respond in 3-4 sentences: (1) a clear verdict on who wins and how decisively (or call it fair), (2) the single most important reason, naming specific players, and (3) if it isn't fair, one concrete addition that would balance it (e.g. "a mid-tier WR2 or an early 2nd"). Be direct — no hedging, no restating the numbers back.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    return NextResponse.json({ overview: text });
  } catch (err) {
    console.error("[trade-analyzer/overview]", err);
    return NextResponse.json({ error: "Failed to generate overview" }, { status: 500 });
  }
}
