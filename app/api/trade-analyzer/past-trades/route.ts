import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/db";

export const dynamic = "force-dynamic";

const SLEEPER = "https://api.sleeper.app/v1";
const CACHE = { next: { revalidate: 1800 } } as RequestInit;
const MAX_SEASONS = 2;
const MAX_WEEKS = 18;

type SleeperTrade = {
  transaction_id: string;
  type: string;
  status: string;
  created: number;
  leg: number;
  roster_ids: number[] | null;
  adds: Record<string, number> | null;
  draft_picks: { season: string; round: number; roster_id: number; owner_id: number }[] | null;
  waiver_budget: { sender: number; receiver: number; amount: number }[] | null;
};

type SleeperDraft = {
  draft_id: string;
  status: string;
  season: string;
  slot_to_roster_id: Record<string, number> | null;
};

type SleeperDraftPick = {
  player_id: string | null;
  roster_id: number | string | null;
  round: number;
  draft_slot: number;
  metadata: { first_name?: string; last_name?: string; position?: string } | null;
};

type TradePick = {
  season: string;
  round: number;
  originalRosterId: number;
  became: {
    sleeperId: string;
    name: string;
    position: string | null;
    pickLabel: string;       // e.g. "2.03"
    draftedBy: string | null;
  } | null;
  laterTraded: boolean;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, CACHE);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// GET /api/trade-analyzer/past-trades?leagueId=<sleeperLeagueId>
export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get("leagueId");
  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
  }

  try {
    // Walk the previous_league_id chain to cover this season and the one before
    const seasonLeagues: { leagueId: string; season: string }[] = [];
    let currentId: string | null = leagueId;
    while (currentId && seasonLeagues.length < MAX_SEASONS) {
      const league: { season: string; previous_league_id: string | null } | null =
        await fetchJson(`${SLEEPER}/league/${currentId}`);
      if (!league) break;
      seasonLeagues.push({ leagueId: currentId, season: league.season });
      currentId = league.previous_league_id;
    }
    if (seasonLeagues.length === 0) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const seasonData = await Promise.all(
      seasonLeagues.map(async ({ leagueId: id, season }) => {
        const weeks = Array.from({ length: MAX_WEEKS }, (_, i) => i + 1);
        const [rosters, users, drafts, ...txWeeks] = await Promise.all([
          fetchJson<{ roster_id: number; owner_id: string | null }[]>(`${SLEEPER}/league/${id}/rosters`),
          fetchJson<{ user_id: string; display_name: string }[]>(`${SLEEPER}/league/${id}/users`),
          fetchJson<SleeperDraft[]>(`${SLEEPER}/league/${id}/drafts`),
          ...weeks.map((w) => fetchJson<SleeperTrade[]>(`${SLEEPER}/league/${id}/transactions/${w}`)),
        ]);
        return { season, rosters: rosters ?? [], users: users ?? [], drafts: drafts ?? [], txWeeks };
      })
    );

    // Team display names per season (roster ids persist across renewals, but owners can change)
    const teamName = new Map<string, string>(); // `${season}_${rosterId}` -> display name
    for (const sd of seasonData) {
      const userMap = new Map(sd.users.map((u) => [u.user_id, u.display_name]));
      for (const r of sd.rosters) {
        teamName.set(
          `${sd.season}_${r.roster_id}`,
          (r.owner_id && userMap.get(r.owner_id)) || `Roster ${r.roster_id}`
        );
      }
    }

    // Resolve completed drafts so past picks can be traced to the player actually selected.
    // A traded pick is identified by (season, round, original roster); the original roster's
    // draft slot comes from slot_to_roster_id, and the selection at (round, slot) is the player.
    // The league drafts list omits slot_to_roster_id, so fetch each draft's detail for it
    const completedDrafts = seasonData
      .flatMap((sd) => sd.drafts)
      .filter((d) => d?.status === "complete" && d.draft_id);
    const [draftDetails, draftPickLists] = await Promise.all([
      Promise.all(completedDrafts.map((d) => fetchJson<SleeperDraft>(`${SLEEPER}/draft/${d.draft_id}`))),
      Promise.all(completedDrafts.map((d) => fetchJson<SleeperDraftPick[]>(`${SLEEPER}/draft/${d.draft_id}/picks`))),
    ]);

    const draftResolver = new Map<string, TradePick["became"]>();
    completedDrafts.forEach((draft, i) => {
      const slotToRoster = draftDetails[i]?.slot_to_roster_id;
      if (!slotToRoster) return;
      const rosterBySlot = new Map(Object.entries(slotToRoster).map(([slot, rid]) => [Number(slot), rid]));
      for (const dp of draftPickLists[i] ?? []) {
        if (!dp?.player_id) continue;
        const originalRosterId = rosterBySlot.get(dp.draft_slot);
        if (originalRosterId == null) continue;
        const metaName = [dp.metadata?.first_name, dp.metadata?.last_name].filter(Boolean).join(" ");
        const drafterRosterId = dp.roster_id != null ? Number(dp.roster_id) : null;
        draftResolver.set(`${draft.season}_${dp.round}_${originalRosterId}`, {
          sleeperId: dp.player_id,
          name: metaName || `Player ${dp.player_id}`,
          position: dp.metadata?.position ?? null,
          pickLabel: `${dp.round}.${String(dp.draft_slot).padStart(2, "0")}`,
          draftedBy: drafterRosterId != null ? (teamName.get(`${draft.season}_${drafterRosterId}`) ?? null) : null,
        });
      }
    });

    const allTrades = seasonData
      .flatMap((sd) => {
        const trades = sd.txWeeks
          .flatMap((txs) => txs ?? [])
          .filter((t) => t.type === "trade" && t.status === "complete");

        // The same trade can appear under multiple weeks; dedupe by transaction id
        const seen = new Set<string>();

        return trades
          .filter((t) => !seen.has(t.transaction_id) && seen.add(t.transaction_id))
          .map((trade) => {
            const teams = new Map<number, {
              rosterId: number;
              ownerId: string | null;
              teamName: string;
              players: { sleeperId: string; name: string; position: string | null }[];
              picks: TradePick[];
              faab: number;
            }>();

            const teamFor = (rosterId: number) => {
              if (!teams.has(rosterId)) {
                const ownerId = sd.rosters.find((r) => r.roster_id === rosterId)?.owner_id ?? null;
                teams.set(rosterId, {
                  rosterId,
                  ownerId,
                  teamName: teamName.get(`${sd.season}_${rosterId}`) ?? `Roster ${rosterId}`,
                  players: [],
                  picks: [],
                  faab: 0,
                });
              }
              return teams.get(rosterId)!;
            };

            for (const rosterId of trade.roster_ids ?? []) teamFor(rosterId);

            for (const [playerId, rosterId] of Object.entries(trade.adds ?? {})) {
              teamFor(rosterId).players.push({ sleeperId: playerId, name: playerId, position: null });
            }
            for (const pick of trade.draft_picks ?? []) {
              teamFor(pick.owner_id).picks.push({
                season: pick.season,
                round: pick.round,
                originalRosterId: pick.roster_id,
                became: draftResolver.get(`${pick.season}_${pick.round}_${pick.roster_id}`) ?? null,
                laterTraded: false,
              });
            }
            for (const wb of trade.waiver_budget ?? []) {
              teamFor(wb.receiver).faab += wb.amount;
            }

            return {
              id: trade.transaction_id,
              season: sd.season,
              week: trade.leg,
              created: trade.created,
              teams: Array.from(teams.values()),
            };
          });
      })
      .sort((a, b) => b.created - a.created);

    // Mark picks that changed hands again in a later trade (the pick's "lifeline")
    const pickTradeTimes = new Map<string, number[]>();
    for (const trade of allTrades) {
      for (const team of trade.teams) {
        for (const pk of team.picks) {
          const key = `${pk.season}_${pk.round}_${pk.originalRosterId}`;
          if (!pickTradeTimes.has(key)) pickTradeTimes.set(key, []);
          pickTradeTimes.get(key)!.push(trade.created);
        }
      }
    }
    for (const trade of allTrades) {
      for (const team of trade.teams) {
        for (const pk of team.picks) {
          const times = pickTradeTimes.get(`${pk.season}_${pk.round}_${pk.originalRosterId}`)!;
          pk.laterTraded = times.some((t) => t > trade.created);
        }
      }
    }

    // Resolve player names/positions from the local Sleeper player cache
    const playerIds = new Set<string>();
    for (const trade of allTrades) {
      for (const team of trade.teams) {
        for (const p of team.players) playerIds.add(p.sleeperId);
        for (const pk of team.picks) if (pk.became) playerIds.add(pk.became.sleeperId);
      }
    }
    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: Array.from(playerIds) } },
      select: { id: true, full_name: true, position: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p]));

    for (const trade of allTrades) {
      for (const team of trade.teams) {
        for (const p of team.players) {
          const info = playerMap.get(p.sleeperId);
          p.name = info?.full_name ?? `Player ${p.sleeperId}`;
          p.position = info?.position ?? null;
        }
        for (const pk of team.picks) {
          if (!pk.became) continue;
          const info = playerMap.get(pk.became.sleeperId);
          if (info?.full_name) pk.became.name = info.full_name;
          if (info?.position) pk.became.position = info.position;
        }
      }
    }

    return NextResponse.json({ trades: allTrades });
  } catch (e: any) {
    console.error("[trade-analyzer/past-trades]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
