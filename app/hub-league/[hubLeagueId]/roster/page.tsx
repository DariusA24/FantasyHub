"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LeagueNav } from "../LeagueNav";
import { PlayerStatsModal } from "@/components/player/PlayerStatsModal";
import { FiTrendingUp, FiTrendingDown, FiMinus, FiAlertCircle } from "react-icons/fi";

// Sleeper CDN thumbnail
const playerThumb = (id: string) =>
  `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;


function TrendBadge({ position, posRank, trend }: { position?: string | null; posRank?: number | null; trend?: number | null }) {
  const pos = position ?? "?";
  if (!posRank) return <span className="text-xs text-zinc-500">—</span>;
  const up = (trend ?? 0) > 0;
  const flat = (trend ?? 0) === 0;
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{pos}{posRank}</span>
      {!flat && (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {up ? <FiTrendingUp className="h-3 w-3" /> : <FiTrendingDown className="h-3 w-3" />}
        </span>
      )}
      {flat && <FiMinus className="h-3 w-3 text-zinc-500" />}
    </div>
  );
}


const POSITION_COLOR: Record<string, string> = {
  QB:  "text-red-600 dark:text-red-400",
  RB:  "text-emerald-600 dark:text-emerald-400",
  WR:  "text-blue-600 dark:text-blue-400",
  TE:  "text-orange-600 dark:text-orange-400",
  K:   "text-purple-600 dark:text-purple-400",
  DEF: "text-zinc-600 dark:text-zinc-400",
};

type LeagueSettings = {
  name: string;
  scoring_settings: Record<string, number>;
  settings: Record<string, number>;
  roster_positions: string[];
};

function scoringLabel(leagueSettings: LeagueSettings): string {
  const type = leagueSettings.settings?.type;
  if (type === 2) return "Dynasty";
  const positions = leagueSettings.roster_positions ?? [];
  if (positions.includes("SUPER_FLEX")) return "2QB / SuperFlex";
  const rec = leagueSettings.scoring_settings?.rec ?? 0;
  if (rec >= 1) return "PPR";
  if (rec >= 0.5) return "Half-PPR";
  return "Standard";
}

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters?: string[];
  settings?: {
    wins?: number;
    losses?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
};

export type SleeperPlayer = {
  player_id: string;
  full_name?: string | null;
  position?: string | null;
  team?: string | null;
};

type UserProfile = {
  id: number;
  clerkId: string;
  sleeperProfileId: string | null;
};

type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string } | null;
};


export default function LeaguePage() {
  const params = useParams();
  const { isLoaded, isSignedIn, user } = useUser();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [myRoster, setMyRoster] = useState<SleeperRoster | null>(null);
  const [allRosters, setAllRosters] = useState<SleeperRoster[]>([]);
  const [leagueUsers, setLeagueUsers] = useState<SleeperLeagueUser[]>([]);
  const [viewingRosterId, setViewingRosterId] = useState<number | null>(null);
  const [player,   setPlayer]   = useState<{ [key: string]: SleeperPlayer }>({});
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [dynastyMap, setDynastyMap] = useState<Record<string, { positionRank: number; overallRank: number; value: number; trend30Day: number } | null>>({});
  const [projMap, setProjMap]   = useState<Record<string, number>>({});
  const [statsMap, setStatsMap] = useState<Record<string, number>>({});
  const [projLoading, setProjLoading] = useState(false);

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!isLoaded) return;

      const hubLeagueId = params?.hubLeagueId;
      if (!hubLeagueId || typeof hubLeagueId !== "string") {
        setError("Invalid hub league id.");
        setLoading(false);
        return;
      }

      // Demo mode: bypass auth, load from public mock endpoints
      if (hubLeagueId === "demo") {
        setLoading(true);
        setError(null);
        try {
          const [rostersRes, leagueRes, usersRes] = await Promise.all([
            fetch("/api/sleeper/rosters/demo"),
            fetch("/api/sleeper/league/demo"),
            fetch("/api/sleeper/league/demo/users"),
          ]);
          const [rosters, leagueData, usersData] = await Promise.all([
            rostersRes.json(),
            leagueRes.json(),
            usersRes.json(),
          ]);
          if (leagueData) setLeagueSettings(leagueData);
          if (Array.isArray(usersData)) setLeagueUsers(usersData);
          if (Array.isArray(rosters) && rosters.length > 0) {
            setAllRosters(rosters);
            const myR = rosters.find((r: SleeperRoster) => r.owner_id === "demo-2") ?? rosters[0];
            setMyRoster(myR);
            setViewingRosterId(myR.roster_id);
            const allPlayerIds = Array.from(new Set(rosters.flatMap((r: SleeperRoster) => r.players ?? [])));
            if (allPlayerIds.length > 0) {
              const playersRes = await fetch(`/api/sleeper/players?ids=${encodeURIComponent(allPlayerIds.join(","))}`);
              if (playersRes.ok) setPlayer(await playersRes.json());
            }
          }
        } catch (e) {
          console.error("[Demo] Roster load error:", e);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!isSignedIn || !user) {
        setError("You must be signed in to view this league.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Get HubLeagueSeason so we can read sleeperLeagueId
        const seasonRes = await fetch(`/api/hub-league-season/${hubLeagueId}`);
        if (!seasonRes.ok) {
          const txt = await seasonRes.text().catch(() => "");
          console.error("LeaguePage /api/hub-league-season failed:", txt);
          setError("Failed to load hub league season.");
          setLoading(false);
          return;
        }

        const seasonJson: any = await seasonRes.json();
        console.log("[LeaguePage] seasonJson:", seasonJson);
        console.log(
          "[LeaguePage] seasonJson keys:",
          seasonJson && typeof seasonJson === "object"
            ? Object.keys(seasonJson)
            : seasonJson
        );

        if (!seasonJson) {
          console.error(
            "[LeaguePage] Could not resolve hubLeagueSeason from seasonJson"
          );
          setError("Unexpected hub league season response from server.");
          setLoading(false);
          return;
        }

        console.log("hub league season:" + seasonJson.sleeperLeagueId)

        if (!seasonJson.sleeperLeagueId) {
          console.error(
            "[LeaguePage] No sleeperLeagueId on hubLeagueSeason:",
            seasonJson
          );
          setError("No Sleeper league linked to this hub league season.");
          setLoading(false);
          return;
        }

        const sleeperLeagueId = seasonJson.sleeperLeagueId;

        // 2) Load user profile -> sleeperProfileId
        const profileRes = await fetch("/api/profile", { method: "GET" });
        if (!profileRes.ok) {
          const txt = await profileRes.text().catch(() => "");
          console.error("LeaguePage /api/profile failed:", txt);
          setError("Failed to load user profile.");
          setLoading(false);
          return;
        }

        const profileJson = await profileRes.json();
        const userProfile: UserProfile | null =
          (profileJson && profileJson.profile) || (profileJson as UserProfile) || null;

        const sleeperProfileId = userProfile?.sleeperProfileId || null;

        if (!sleeperProfileId) {
          setError("Sleeper account not linked to this user.");
          setLoading(false);
          return;
        }

        // 3) Fetch live rosters, league settings, and league users in parallel
        const [rostersRes, leagueRes, usersRes] = await Promise.all([
          fetch(`/api/sleeper/rosters/${encodeURIComponent(sleeperLeagueId)}`),
          fetch(`/api/sleeper/league/${encodeURIComponent(sleeperLeagueId)}`),
          fetch(`/api/sleeper/league/${encodeURIComponent(sleeperLeagueId)}/users`),
        ]);

        if (!rostersRes.ok) {
          const txt = await rostersRes.text().catch(() => "");
          console.error("LeaguePage /api/sleeper/rosters failed:", txt);
          setError("Failed to load rosters from Sleeper.");
          setLoading(false);
          return;
        }

        if (leagueRes.ok) {
          const leagueData = await leagueRes.json();
          setLeagueSettings(leagueData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setLeagueUsers(Array.isArray(usersData) ? usersData : []);
        }

        const rosters: SleeperRoster[] = await rostersRes.json();

        if (!Array.isArray(rosters) || rosters.length === 0) {
          setError("No rosters found for this league.");
          setLoading(false);
          return;
        }

        setAllRosters(rosters);

        let userRoster = rosters.find((r) => r.owner_id === sleeperProfileId) ?? rosters[0];
        setMyRoster(userRoster);
        setViewingRosterId(userRoster.roster_id);

        // Collect all unique player IDs across all rosters for one bulk fetch
        const allPlayerIds = Array.from(
          new Set(rosters.flatMap((r) => r.players ?? []))
        );

        if (allPlayerIds.length > 0) {
          const ids = allPlayerIds.join(",");
          const playersRes = await fetch(`/api/sleeper/players?ids=${encodeURIComponent(ids)}`);
          if (!playersRes.ok) {
            console.error("LeaguePage /api/sleeper/players failed:", playersRes.status);
            setPlayer({});
          } else {
            const playersData = await playersRes.json();
            setPlayer(playersData);
          }
        } else {
          setPlayer({});
        }
      } catch (err) {
        console.error("Error fetching league data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
  }, [isLoaded, isSignedIn, user, params]);

  useEffect(() => {
    if (!leagueSettings) return;
    const isSF = (leagueSettings.roster_positions as string[] | undefined)?.includes('SUPER_FLEX') ?? false;
    const numQbs: 1 | 2 = isSF ? 2 : 1;
    fetch(`/api/dynasty-rankings/all?numQbs=${numQbs}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: any[]) => {
        const map: Record<string, any> = {};
        for (const entry of data) {
          if (entry.player?.sleeperId) map[entry.player.sleeperId] = entry;
        }
        setDynastyMap(map);
      })
      .catch((err) => console.error('[Roster] dynasty rankings error:', err));
  }, [leagueSettings]);

  // Fetch weekly projections + last week's actual stats
  useEffect(() => {
    if (!leagueSettings) return;
    const rec = leagueSettings.scoring_settings?.rec ?? 1;
    const ptsKey = rec >= 1 ? "pts_ppr" : rec >= 0.5 ? "pts_half_ppr" : "pts_std";

    setProjLoading(true);
    fetch("/api/start-sit/nfl-state")
      .then((r) => r.json())
      .then(async (state: { week: number; display_week: number; season: string; season_type: string }) => {
        const week   = Math.max(state.display_week ?? 1, 1);
        const season = state.season;

        const fetches: [Promise<Response>, Promise<Response> | null] = [
          fetch(`/api/start-sit/projections?week=${week}&season=${season}`),
          week > 1 ? fetch(`/api/start-sit/stats?week=${week - 1}&season=${season}`) : null,
        ];
        const [projRes, statsRes] = await Promise.all(fetches);

        if (projRes?.ok) {
          const d = await projRes.json();
          if (d.projections) {
            const m: Record<string, number> = {};
            for (const [id, e] of Object.entries(d.projections as Record<string, any>)) {
              m[id] = (e as any)[ptsKey] ?? (e as any).pts_ppr ?? 0;
            }
            setProjMap(m);
          }
        }
        if (statsRes?.ok) {
          const d = await statsRes.json();
          if (d.stats) {
            const m: Record<string, number> = {};
            for (const [id, e] of Object.entries(d.stats as Record<string, any>)) {
              m[id] = (e as any)[ptsKey] ?? (e as any).pts_ppr ?? 0;
            }
            setStatsMap(m);
          }
        }
      })
      .catch((err) => console.error('[Roster] projections error:', err))
      .finally(() => setProjLoading(false));
  }, [leagueSettings]);

  const userMap = useMemo(() => {
    const m: Record<string, SleeperLeagueUser> = {};
    for (const u of leagueUsers) m[u.user_id] = u;
    return m;
  }, [leagueUsers]);

  const displayedRoster = useMemo(() => {
    if (viewingRosterId === null) return myRoster;
    return allRosters.find((r) => r.roster_id === viewingRosterId) ?? myRoster;
  }, [viewingRosterId, allRosters, myRoster]);

  const { starters, bench } = useMemo(() => {
    if (!displayedRoster?.players) {
      return { starters: [] as string[], bench: [] as string[] };
    }

    const startersArr = displayedRoster.starters ?? [];
    const startersSet = new Set(startersArr);

    const benchArr = displayedRoster.players.filter(
      (playerId) => !startersSet.has(playerId)
    );

    return { starters: startersArr, bench: benchArr };
  }, [displayedRoster]);

  const pageShell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-gray-800 dark:text-zinc-200">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) {
    return pageShell(
      <div className="mt-6 rounded-2xl border border-[#1d212b] bg-[#050609]/80 p-6">
        <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-zinc-800/80 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-zinc-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-red-400 mb-3">{error}</p>
        <button className="text-sm text-[#F4D06F] hover:underline" onClick={() => window.history.back()}>
          ← Go back
        </button>
      </div>
    );
  }

  const selectedPlayer =
    selectedPlayerId != null ? player[selectedPlayerId] ?? null : null;

  const viewedOwner = displayedRoster ? userMap[displayedRoster.owner_id] : null;
  const viewedTeamName = viewedOwner?.metadata?.team_name || viewedOwner?.display_name || null;
  const isViewingOwn = displayedRoster?.owner_id === myRoster?.owner_id;

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-gray-800 dark:text-zinc-200">
        <LeagueNav />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700/70 px-3 py-1 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Active League
            </span>
          </div>
        </div>
      </div>

      {!myRoster ? (
        <div className="rounded-2xl border border-dashed border-zinc-700/80 bg-gray-100 dark:bg-zinc-900/40 p-5 text-sm text-gray-300 dark:text-zinc-300">
          You do not have a roster in this league.
        </div>
      ) : (
        <>
        {/* ─── League settings banner ─── */}
        {leagueSettings && (() => {
          const format = scoringLabel(leagueSettings);
          const teams = leagueSettings.settings?.num_teams ?? "—";
          const rec = leagueSettings.scoring_settings?.rec ?? 0;
          const passTd = leagueSettings.scoring_settings?.pass_td ?? 4;
          const rushTd = leagueSettings.scoring_settings?.rush_td ?? 6;
          const isSF = (leagueSettings.roster_positions as string[] | undefined)?.includes('SUPER_FLEX') ?? false;
          const chips: { label: string; value: string | number; highlight?: boolean }[] = [
            { label: "Format", value: format },
            { label: "QB", value: isSF ? "SuperFlex" : "Not SuperFlex", highlight: isSF },
            { label: "Teams", value: teams },
            { label: "Rec pts", value: rec },
            { label: "Pass TD", value: passTd },
            { label: "Rush/Rec TD", value: rushTd },
          ];
          return (
            <div className="mb-5 hub-card px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 shrink-0">League Settings</span>
              {chips.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">{c.label}</span>
                  <span className={`text-xs font-bold ${c.highlight ? "text-amber-600 dark:text-[#F4D06F]" : "text-zinc-800 dark:text-zinc-100"}`}>{c.value}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ─── Team picker ─── */}
        {allRosters.length > 1 && (
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">League Rosters</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {allRosters.map((roster) => {
                const owner = userMap[roster.owner_id];
                const teamName = owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`;
                const avatarUrl = owner?.avatar
                  ? `https://sleepercdn.com/avatars/thumbs/${owner.avatar}`
                  : null;
                const wins = (roster as any).settings?.wins ?? 0;
                const losses = (roster as any).settings?.losses ?? 0;
                const isSelected = roster.roster_id === viewingRosterId;
                const isMe = roster.owner_id === myRoster?.owner_id;
                return (
                  <button
                    key={roster.roster_id}
                    onClick={() => { setViewingRosterId(roster.roster_id); setPosFilter("ALL"); }}
                    className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all text-left ${
                      isSelected
                        ? "border-amber-500/50 dark:border-[#F4D06F]/50 bg-amber-500/10 dark:bg-[#F4D06F]/10"
                        : "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={teamName}
                        className="h-7 w-7 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60 shrink-0 flex items-center justify-center text-[10px] text-zinc-500">
                        {teamName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate max-w-[100px] ${isSelected ? "text-amber-600 dark:text-[#F4D06F]" : "text-zinc-700 dark:text-zinc-200"}`}>
                        {teamName}
                        {isMe && <span className="ml-1 text-[9px] text-zinc-500">(you)</span>}
                      </p>
                      <p className="text-[10px] text-zinc-500">{wins}–{losses}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Roster summary bar ─── */}
        {(() => {
          const allPlayers = displayedRoster?.players ?? [];
          const startersSet = new Set(displayedRoster?.starters ?? []);
          const totalProj = [...startersSet].reduce((sum, id) => sum + (projMap[id] ?? 0), 0);
          const seasonFpts = (displayedRoster?.settings?.fpts ?? 0) + (displayedRoster?.settings?.fpts_decimal ?? 0) / 100;
          const posCounts = allPlayers.reduce<Record<string, number>>((acc, id) => {
            const pos = player[id]?.position ?? "?";
            acc[pos] = (acc[pos] ?? 0) + 1;
            return acc;
          }, {});
          return (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: projLoading ? "Loading proj…" : "Starters Proj", value: projLoading ? "—" : totalProj.toFixed(1), color: "text-zinc-800 dark:text-zinc-100" },
                { label: "Season FPTS", value: seasonFpts > 0 ? seasonFpts.toFixed(1) : "—", color: "text-amber-600 dark:text-[#F4D06F]" },
                { label: "Roster Size", value: allPlayers.length, color: "text-zinc-800 dark:text-zinc-100" },
                { label: "Positions", value: Object.entries(posCounts).map(([p, n]) => `${p}×${n}`).join(" · "), color: "text-zinc-500 dark:text-zinc-400" },
              ].map((s) => (
                <div key={s.label} className="hub-card px-4 py-3 text-center">
                  <p className={`text-base font-black ${s.color} truncate`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ─── Position filter tabs ─── */}
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          {["ALL", "QB", "RB", "WR", "TE", "K", "DEF"].map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                posFilter === pos
                  ? "border-amber-500/50 dark:border-[#F4D06F]/50 bg-amber-500/10 dark:bg-[#F4D06F]/10 text-amber-600 dark:text-[#F4D06F]"
                  : "border-zinc-300 dark:border-zinc-800/60 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* ─── Viewing banner ─── */}
        {!isViewingOwn && viewedTeamName && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Viewing roster of</span>
            <span className="text-xs font-bold text-amber-600 dark:text-[#F4D06F]">{viewedTeamName}</span>
            <button
              onClick={() => { setViewingRosterId(myRoster?.roster_id ?? null); setPosFilter("ALL"); }}
              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Back to my roster
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Starters card */}
          <section
            className="hub-card shadow-[0_0_25px_rgba(0,0,0,0.6)] p-4 md:p-5 mb-10"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#F4D06F]">
                  Starters
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Your active lineup for this week.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                {starters.length} active
              </span>
            </div>
            {starters.length > 0 ? (
              <>
                <div className="mb-1 grid grid-cols-[36px_1fr_48px_48px_72px] gap-x-3 px-2 text-[9px] uppercase tracking-widest text-zinc-600">
                  <span />
                  <span />
                  <span className="text-right">Proj</span>
                  <span className="text-right">Last Wk</span>
                  <span className="text-right">Trend</span>
                </div>
                <ul className="divide-y divide-zinc-800/40 text-sm">
                  {starters.filter(id => posFilter === "ALL" || player[id]?.position === posFilter).map((playerId) => {
                    const p = player[playerId];
                    const displayName = p?.full_name || p?.player_id || playerId;
                    const proj    = projMap[playerId];
                    const lastWk  = statsMap[playerId];
                    const posColor = POSITION_COLOR[p?.position ?? ""] ?? "text-zinc-400";
                    const dynasty = dynastyMap[playerId];
                    return (
                      <li
                        key={playerId}
                        onClick={() => { setSelectedPlayerId(playerId); setIsStatsOpen(true); }}
                        className="grid grid-cols-[36px_1fr_48px_48px_72px] items-center gap-x-3 py-2 px-2 -mx-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                      >
                        <img
                          src={playerThumb(playerId)}
                          alt={displayName}
                          className="h-9 w-9 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{displayName}</p>
                          <p className="text-[11px]">
                            {p?.position && <span className={`mr-1.5 font-bold ${posColor}`}>{p.position}</span>}
                            {p?.team && <span className="text-zinc-500">{p.team}</span>}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-right">
                          {proj != null ? proj.toFixed(1) : <span className="text-zinc-500">—</span>}
                        </p>
                        <p className="text-xs font-semibold text-amber-600 dark:text-[#F4D06F] text-right">
                          {lastWk != null ? lastWk.toFixed(1) : <span className="text-zinc-500">—</span>}
                        </p>
                        <div className="flex justify-end">
                          <TrendBadge position={p?.position} posRank={dynasty?.positionRank ?? null} trend={dynasty?.trend30Day ?? null} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-zinc-400">No starters found.</p>
            )}
          </section>

          {/* Bench card */}
          <section
            className="hub-card shadow-[0_0_18px_rgba(0,0,0,0.5)] p-4 md:p-5 mb-10"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                  Bench
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Depth pieces and future starters.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700/40 text-gray-800 dark:text-zinc-200 border border-zinc-600/60">
                {bench.length} players
              </span>
            </div>
            {bench.length > 0 ? (
              <>
                <div className="mb-1 grid grid-cols-[36px_1fr_48px_48px_72px] gap-x-3 px-2 text-[9px] uppercase tracking-widest text-zinc-600">
                  <span />
                  <span />
                  <span className="text-right">Proj</span>
                  <span className="text-right">FPTS</span>
                  <span className="text-right">Trend</span>
                </div>
                <ul className="divide-y divide-zinc-800/40 text-sm">
                  {bench.filter(id => posFilter === "ALL" || player[id]?.position === posFilter).map((playerId) => {
                    const p = player[playerId];
                    const displayName = p?.full_name || p?.player_id || playerId;
                    const proj   = projMap[playerId];
                    const lastWk = statsMap[playerId];
                    const posColor = POSITION_COLOR[p?.position ?? ""] ?? "text-zinc-400";
                    const dynasty = dynastyMap[playerId];
                    return (
                      <li
                        key={playerId}
                        onClick={() => { setSelectedPlayerId(playerId); setIsStatsOpen(true); }}
                        className="grid grid-cols-[36px_1fr_48px_48px_72px] items-center gap-x-3 py-2 px-2 -mx-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                      >
                        <img
                          src={playerThumb(playerId)}
                          alt={displayName}
                          className="h-9 w-9 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/default-profile.png"; }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{displayName}</p>
                          <p className="text-[11px]">
                            {p?.position && <span className={`mr-1.5 font-bold ${posColor}`}>{p.position}</span>}
                            {p?.team && <span className="text-zinc-500">{p.team}</span>}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-right">
                          {proj != null ? proj.toFixed(1) : <span className="text-zinc-500">—</span>}
                        </p>
                        <p className="text-xs font-semibold text-amber-600 dark:text-[#F4D06F] text-right">
                          {lastWk != null ? lastWk.toFixed(1) : <span className="text-zinc-500">—</span>}
                        </p>
                        <div className="flex justify-end">
                          <TrendBadge position={p?.position} posRank={dynasty?.positionRank ?? null} trend={dynasty?.trend30Day ?? null} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-zinc-400">No bench players.</p>
            )}
          </section>
        </div>
</>
      )}

      {/* Player stats modal */}
      <PlayerStatsModal
        open={isStatsOpen}
        player={selectedPlayer}
        isSuperFlex={
          (leagueSettings?.roster_positions as string[] | undefined)?.includes('SUPER_FLEX') ?? false
        }
        onClose={() => {
          setIsStatsOpen(false);
          setSelectedPlayerId(null);
        }}
      />
      </div>
    </div>
  );
}
