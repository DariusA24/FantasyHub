import { NextRequest, NextResponse } from "next/server";

const PROFILES: Record<string, { bio: string; playerStyle: string; playerStyleSub: string; favoriteAsset: string; favoriteAssetSub: string; tradeActivity: string; tradeActivitySub: string; mode: string; modeSub: string; rival: string; rivalSub: string }> = {
  "demo-1": { bio: "3-time champion. Commissioner. Will not apologize.", playerStyle: "Veteran", playerStyleSub: "Proven producers only", favoriteAsset: "WR", favoriteAssetSub: "Alpha receivers win leagues", tradeActivity: "Active", tradeActivitySub: "Always looking to upgrade", mode: "Win Now", modeSub: "No patience for rebuilds", rival: "Tyler R.", rivalSub: "The CeeDee trade will haunt him" },
  "demo-2": { bio: "Back-to-back champ 2023–2024. Currently plotting the 3-peat.", playerStyle: "Veteran", playerStyleSub: "No rookies in my starting lineup", favoriteAsset: "RB", favoriteAssetSub: "Running backs win playoff games", tradeActivity: "Maybe", tradeActivitySub: "Only trade if it makes me better", mode: "Win Now", modeSub: "Every season is the season", rival: "Marcus W.", rivalSub: "He's had my number in the playoffs" },
  "demo-3": { bio: "That CeeDee trade was a masterpiece. You'll see.", playerStyle: "Rookie", playerStyleSub: "High upside always", favoriteAsset: "WR", favoriteAssetSub: "Volume receivers are underrated", tradeActivity: "Active", tradeActivitySub: "I trade more than anyone", mode: "Win Now", modeSub: "I don't rebuild, I reload", rival: "Marcus W.", rivalSub: "0-7 all time. It's fine. I'm fine." },
  "demo-4": { bio: "Founding season champ. Quietly dangerous every year.", playerStyle: "Veteran", playerStyleSub: "I trust film over ADP", favoriteAsset: "QB", favoriteAssetSub: "Superflex is life", tradeActivity: "Not Active", tradeActivitySub: "Set it and forget it", mode: "Win Now", modeSub: "Always competing", rival: "You", rivalSub: "Too close every week" },
  "demo-5": { bio: "Middle of the pack but always in contention.", playerStyle: "Rookie", playerStyleSub: "I love the upside plays", favoriteAsset: "Picks", favoriteAssetSub: "Draft capital is king", tradeActivity: "Active", tradeActivitySub: "Buy low, sell high", mode: "Rebuild", modeSub: "Playing the long game", rival: "Sam T.", rivalSub: "He always gets me at the wrong time" },
};

const DEFAULT_PROFILE = { bio: "Still figuring out this game.", playerStyle: "Rookie", playerStyleSub: "", favoriteAsset: "WR", favoriteAssetSub: "", tradeActivity: "Maybe", tradeActivitySub: "", mode: "Win Now", modeSub: "", rival: "", rivalSub: "" };

export async function GET(req: NextRequest) {
  const sleeperUserId = req.nextUrl.searchParams.get("sleeperUserId") ?? "demo-2";
  const mp = PROFILES[sleeperUserId] ?? DEFAULT_PROFILE;

  return NextResponse.json({
    profile: null,
    managerProfile: mp,
    favoritePlayer: null,
  });
}
