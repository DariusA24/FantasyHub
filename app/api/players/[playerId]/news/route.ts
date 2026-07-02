import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

type ESPNArticle = {
  id: number;
  headline: string;
  description?: string;
  published: string;
  lastModified: string;
  images?: { url: string; width: number; height: number; type: string }[];
  links?: { web?: { href: string } };
  categories?: { type: string; description?: string; athleteId?: number }[];
};

// In-memory cache: ESPN bulk news expires every 20 minutes
let espnCache: { articles: ESPNArticle[]; expiry: number } | null = null;
const ESPN_TTL = 20 * 60 * 1000;

async function fetchESPNNews(): Promise<ESPNArticle[]> {
  if (espnCache && Date.now() < espnCache.expiry) return espnCache.articles;

  const res = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100",
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const articles: ESPNArticle[] = data.articles ?? [];
  espnCache = { articles, expiry: Date.now() + ESPN_TTL };
  return articles;
}

// GET /api/players/[playerId]/news
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;

  try {
    // Get player full name from DB
    const player = await prisma.sleeperPlayer.findUnique({
      where: { id: playerId },
      select: { full_name: true },
    });

    const fullName = player?.full_name ?? "";
    if (!fullName) return NextResponse.json([]);

    // Fetch ESPN news and filter by player name in categories
    const articles = await fetchESPNNews();

    const matched = articles.filter((a) =>
      a.categories?.some(
        (c) => c.type === "athlete" && c.description === fullName
      )
    );

    // Shape the response
    const result = matched.map((a) => ({
      id: a.id,
      headline: a.headline,
      description: a.description ?? null,
      published: a.published,
      image: a.images?.find((img) => img.type === "header")?.url ?? null,
      url:
        typeof a.links?.web === "object" && "href" in (a.links.web ?? {})
          ? (a.links.web as { href: string }).href
          : null,
    }));

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("[player-news]", e);
    return NextResponse.json([]);
  }
}
