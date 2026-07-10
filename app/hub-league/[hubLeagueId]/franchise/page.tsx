"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LeagueNav } from "../LeagueNav";
import {
  FiAward,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
  FiShield,
  FiStar,
  FiThumbsDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiRepeat,
  FiUser,
  FiTarget,
  FiEdit2,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import { GiTrophy, GiTie, GiAmericanFootballPlayer } from "react-icons/gi";

// ─── Types ────────────────────────────────────────────────────────────────────

type SleeperPlayerResult = {
  id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
};

type ManagerProfile = {
  bio?: string | null;
  playerStyle?: string | null;
  playerStyleSub?: string | null;
  favoriteAsset?: string | null;
  favoriteAssetSub?: string | null;
  tradeActivity?: string | null;
  tradeActivitySub?: string | null;
  favoritePlayerId?: string | null;
  favoritePlayerSub?: string | null;
  mode?: string | null;
  modeSub?: string | null;
  rival?: string | null;
  rivalSub?: string | null;
};

type ProfileData = {
  id: number;
  firstName: string;
  lastName: string;
  profileImage: string;
  bio: string | null;
};

type HubLeagueData = {
  name: string;
  seasons: { sleeperLeagueId: string; season: string }[];
  owner: { firstName: string; lastName: string; profileImage: string };
};

type RivalOption = { userId: string; displayName: string; record: string };

type Award = {
  id: string;
  season: string;
  type: string;
  label: string;
  description: string;
  value?: string | null;
  week?: number | null;
  sleeperUserId: string;
  profileId?: number | null;
};

// ─── Personality card config ──────────────────────────────────────────────────

const CARD_CONFIG = [
  {
    key: "playerStyle" as const,
    subKey: "playerStyleSub" as const,
    label: "Player Style",
    options: ["Veteran", "Rookie"],
    subPlaceholder: "e.g. Proven producers over upside",
    icon: <FiShield className="h-4 w-4" />,
    accent: "text-blue-500 dark:text-blue-400 border-blue-500/30 bg-blue-500/5",
  },
  {
    key: "favoriteAsset" as const,
    subKey: "favoriteAssetSub" as const,
    label: "Favorite Asset",
    options: ["QB", "RB", "WR", "TE", "Picks"],
    subPlaceholder: "e.g. Alpha receivers win leagues",
    icon: <FiStar className="h-4 w-4" />,
    accent: "text-amber-600 dark:text-[#F4D06F] border-amber-400/30 dark:border-[#F4D06F]/30 bg-amber-500/5 dark:bg-[#F4D06F]/5",
  },
  {
    key: "tradeActivity" as const,
    subKey: "tradeActivitySub" as const,
    label: "Trade Desire",
    options: ["Active", "Maybe", "Not Active"],
    subPlaceholder: "e.g. Always looking to deal",
    icon: <FiRepeat className="h-4 w-4" />,
    accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  },
  {
    key: "mode" as const,
    subKey: "modeSub" as const,
    label: "Mode",
    options: ["Rebuild", "Win Now"],
    subPlaceholder: "e.g. No rebuilds, ever",
    icon: <FiTarget className="h-4 w-4" />,
    accent: "text-red-500 dark:text-red-400 border-red-500/30 bg-red-500/5",
  },
];

// ─── Award display maps ───────────────────────────────────────────────────────

const AWARD_ICON: Record<string, React.ReactNode> = {
  champion:            <GiTrophy className="h-6 w-6" />,
  runner_up:           <FiAward className="h-6 w-6" />,
  toilet_bowl:         <GiTie className="h-6 w-6" />,
  highest_week:        <FiZap className="h-6 w-6" />,
  lowest_pf:           <FiTrendingDown className="h-6 w-6" />,
  most_consistent:     <FiShield className="h-6 w-6" />,
  most_transactions:   <FiTrendingUp className="h-6 w-6" />,
  best_regular_season: <FiStar className="h-6 w-6" />,
  biggest_blowout:     <FiAlertTriangle className="h-6 w-6" />,
};

const AWARD_STYLE: Record<string, string> = {
  champion:            "border-amber-400/40 bg-amber-50 text-amber-600 dark:border-[#F4D06F]/40 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F]",
  runner_up:           "border-gray-300/60 bg-gray-50 text-gray-500 dark:border-zinc-500/40 dark:bg-zinc-700/20 dark:text-zinc-400",
  toilet_bowl:         "border-amber-800/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-700",
  highest_week:        "border-emerald-500/40 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  lowest_pf:           "border-red-400/40 bg-red-50 text-red-500 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400",
  most_consistent:     "border-blue-400/40 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400",
  most_transactions:   "border-blue-400/40 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400",
  best_regular_season: "border-yellow-400/40 bg-yellow-50 text-yellow-600 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-400",
  biggest_blowout:     "border-orange-400/40 bg-orange-50 text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-400",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SeasonStat = {
  season: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  highWeek: number;
  lowWeek: number;
  rank: number | null;
};

type H2HRecord = {
  opponentUserId: string;
  displayName: string;
  opponentAvatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  played: number;
  isRetired: boolean;
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Legend:  { bg: "bg-[#F4D06F]/10",  border: "border-[#F4D06F]/40",  text: "text-[#F4D06F]"  },
  Elite:   { bg: "bg-purple-500/10", border: "border-purple-500/40", text: "text-purple-400" },
  Pro:     { bg: "bg-blue-500/10",   border: "border-blue-500/40",   text: "text-blue-400"   },
  Veteran: { bg: "bg-emerald-500/10",border: "border-emerald-500/40",text: "text-emerald-400"},
  Rookie:  { bg: "bg-zinc-500/10",   border: "border-zinc-500/40",   text: "text-zinc-400"   },
};

const TREND_STYLE: Record<string, string> = {
  up:   "text-emerald-600 dark:text-emerald-400",
  flat: "text-gray-500 dark:text-zinc-400",
  down: "text-red-500 dark:text-red-400",
};
const TREND_ICON: Record<string, React.ReactNode> = {
  up:   <FiCheckCircle className="h-3.5 w-3.5" />,
  flat: <FiShield className="h-3.5 w-3.5" />,
  down: <FiThumbsDown className="h-3.5 w-3.5" />,
};

// ─── Player Search ────────────────────────────────────────────────────────────

function PlayerSearch({ value, onChange }: { value: SleeperPlayerResult | null; onChange: (p: SleeperPlayerResult | null) => void }) {
  const [query, setQuery] = useState(value?.full_name ?? "");
  const [results, setResults] = useState<SleeperPlayerResult[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value?.full_name ?? ""); }, [value]);

  const search = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sleeper/players/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
    }, 300);
  };

  const pick = (p: SleeperPlayerResult) => { onChange(p); setQuery(p.full_name ?? ""); setResults([]); };
  const clear = () => { onChange(null); setQuery(""); setResults([]); };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <FiSearch className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" />
        <input
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-zinc-200 dark:placeholder-zinc-500"
          placeholder="Search player…"
          value={query}
          onChange={(e) => search(e.target.value)}
        />
        {value && (
          <button onClick={clear} className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300">
            <FiX className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((p) => (
            <li key={p.id}>
              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => pick(p)}
              >
                <span className="font-medium hub-text-primary">{p.full_name}</span>
                <span className="ml-auto text-[11px] hub-text-muted">{p.position} · {p.team ?? "FA"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

type SleeperUser = { user_id: string; display_name: string; avatar: string | null };

export default function MyFranchisePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  // Convert URL params to initial state — picker then drives changes
  const [viewingSleeperUserId, setViewingSleeperUserId] = useState<string | null>(
    searchParams.get("sleeperUserId") ?? null
  );
  const viewingProfileId = searchParams.get("profileId") ?? null;
  const isViewingOther = !!viewingSleeperUserId;

  const [sleeperUsers, setSleeperUsers] = useState<SleeperUser[]>([]);
  const [mySleeperUserId, setMySleeperUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [hubLeague, setHubLeague] = useState<HubLeagueData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile>({});
  const [favoritePlayer, setFavoritePlayer] = useState<SleeperPlayerResult | null>(null);
  const [rivalOptions, setRivalOptions] = useState<RivalOption[]>([]);
  const [commissionerName, setCommissionerName] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ManagerProfile>({});
  const [draftPlayer, setDraftPlayer] = useState<SleeperPlayerResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [awards, setAwards] = useState<Award[]>([]);
  const [awardsLoading, setAwardsLoading] = useState(true);

  const [seasonStats, setSeasonStats] = useState<SeasonStat[]>([]);
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(true);
  const [hasSleeperProfile, setHasSleeperProfile] = useState(true);

  const [h2hRecords, setH2hRecords] = useState<H2HRecord[]>([]);
  const [h2hLoading, setH2hLoading] = useState(true);
  const [h2hHistorical, setH2hHistorical] = useState(true);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);

  const [sleeperUserInfo, setSleeperUserInfo] = useState<{ display_name: string; avatar: string | null } | null>(null);
  const [hasHubProfile, setHasHubProfile] = useState(true);
  const [hubRank, setHubRank] = useState<{ tier: string; score: number | null; seasons: number } | null>(null);

  const lastLoadKey = useRef<string | null>(null);

  const fetchAwards = useCallback(async (profileId?: number, sleeperUserId?: string) => {
    setAwardsLoading(true);
    try {
      const qs = sleeperUserId
        ? `?sleeperUserId=${sleeperUserId}`
        : profileId
        ? `?profileId=${profileId}`
        : "";
      if (!qs) { setAwardsLoading(false); return; }
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/awards${qs}`);
      if (res.ok) {
        const data = await res.json();
        setAwards(data.awards ?? []);
      }
    } catch { /* non-critical */ } finally {
      setAwardsLoading(false);
    }
  }, [hubLeagueId]);

  const fetchSeasonStats = useCallback(async () => {
    setSeasonStatsLoading(true);
    try {
      const qs = viewingSleeperUserId
        ? `?sleeperUserId=${viewingSleeperUserId}`
        : viewingProfileId
        ? `?profileId=${viewingProfileId}`
        : "";
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/season-stats${qs}`);
      if (res.ok) {
        const data = await res.json();
        setSeasonStats(data.stats ?? []);
        setHasSleeperProfile(data.hasSleeperProfile ?? true);
      }
    } catch { /* non-critical */ } finally {
      setSeasonStatsLoading(false);
    }
  }, [hubLeagueId, viewingProfileId, viewingSleeperUserId]);

  const fetchH2H = useCallback(async () => {
    setH2hLoading(true);
    try {
      const qs = viewingSleeperUserId
        ? `?sleeperUserId=${viewingSleeperUserId}`
        : viewingProfileId
        ? `?profileId=${viewingProfileId}`
        : "";
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/h2h${qs}`);
      if (res.ok) {
        const data = await res.json();
        const records: H2HRecord[] = data.records ?? [];
        setH2hRecords(records);
        setH2hHistorical(data.hasHistoricalData ?? true);
        if (records.length > 0) setSelectedOpponentId((prev) => prev ?? records[0].opponentUserId);
      }
    } catch { /* non-critical */ } finally {
      setH2hLoading(false);
    }
  }, [hubLeagueId, viewingProfileId, viewingSleeperUserId]);

  const load = useCallback(async () => {
    if (!hubLeagueId) return;
    const loadKey = `${hubLeagueId}|${viewingSleeperUserId ?? ""}|${viewingProfileId ?? ""}`;
    if (lastLoadKey.current === loadKey) return;
    lastLoadKey.current = loadKey;

    // Reset viewer-specific state when switching profiles
    setLoading(true);
    setError(null);
    setProfileData(null);
    setManagerProfile({});
    setFavoritePlayer(null);
    setSleeperUserInfo(null);
    setAwards([]);
    setSeasonStats([]);
    setH2hRecords([]);
    setHasHubProfile(true);
    setSelectedOpponentId(null);
    setHubRank(null);

    try {
      const managerQs = viewingSleeperUserId
        ? `?sleeperUserId=${viewingSleeperUserId}`
        : viewingProfileId
        ? `?profileId=${viewingProfileId}`
        : "";

      const requests: Promise<Response>[] = [
        fetch(`/api/hub-leagues/${hubLeagueId}`),
        fetch(`/api/hub-leagues/${hubLeagueId}/manager-profile${managerQs}`),
      ];
      if (viewingSleeperUserId) {
        requests.push(fetch(`/api/sleeper/user/${viewingSleeperUserId}`));
      }

      const [hubRes, managerRes, sleeperUserRes] = await Promise.all(requests);

      if (!hubRes.ok) {
        const d = await hubRes.json().catch(() => ({}));
        setError(d.error ?? "Failed to load hub league.");
        return;
      }

      const hubData = await hubRes.json();
      const league: HubLeagueData = hubData.hubLeague ?? null;
      setHubLeague(league);
      if (hubData.sleeperProfileId && !mySleeperUserId) {
        setMySleeperUserId(hubData.sleeperProfileId);
      }

      const rankTargetId = viewingSleeperUserId ?? hubData.sleeperProfileId ?? null;
      if (rankTargetId) {
        fetch(`/api/profile/rank?sleeperUserId=${rankTargetId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.tier) setHubRank(data); })
          .catch(() => {});
      }

      if (sleeperUserRes?.ok) {
        const su = await sleeperUserRes.json();
        setSleeperUserInfo({ display_name: su.display_name ?? su.username ?? "Unknown", avatar: su.avatar ?? null });
      }

      if (managerRes?.ok) {
        const md = await managerRes.json();
        const p: ProfileData | null = md.profile ?? null;
        setProfileData(p);
        setHasHubProfile(!!p);
        setManagerProfile(md.managerProfile ?? {});
        setFavoritePlayer(md.favoritePlayer ?? null);
        if (p?.id) {
          fetchAwards(p.id);
        } else if (viewingSleeperUserId) {
          fetchAwards(undefined, viewingSleeperUserId);
        }
      } else {
        setHasHubProfile(false);
        if (viewingSleeperUserId) fetchAwards(undefined, viewingSleeperUserId);
      }
      fetchSeasonStats();
      fetchH2H();

      const seasons = league?.seasons ?? [];
      if (seasons.length > 0) {
        const latestLeagueId = seasons[0].sleeperLeagueId;
        const usersRes = await fetch(`/api/sleeper/league/${latestLeagueId}/users`);
        if (usersRes.ok) {
          const users: (SleeperUser & { is_owner: boolean })[] = await usersRes.json();
          setSleeperUsers(users);
          const commUser = users.find((u) => u.is_owner);
          if (commUser) setCommissionerName(commUser.display_name);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [hubLeagueId, viewingSleeperUserId, viewingProfileId, fetchAwards, fetchSeasonStats, fetchH2H]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (h2hRecords.length === 0) return;
    setRivalOptions(
      h2hRecords.map((r) => ({
        userId: r.opponentUserId,
        displayName: r.displayName,
        record: r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`,
      }))
    );
  }, [h2hRecords]);

  const openEdit = () => { setDraft({ ...managerProfile }); setDraftPlayer(favoritePlayer); setSaveError(null); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setSaveError(null); };
  const setField = (key: keyof ManagerProfile, val: string) => setDraft((d) => ({ ...d, [key]: val }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/manager-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, favoritePlayerId: draftPlayer?.id ?? null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Failed to save.");
        return;
      }
      const saved = await res.json();
      setManagerProfile(saved.managerProfile ?? draft);
      setFavoritePlayer(draftPlayer);
      setEditing(false);
    } catch (e: any) {
      setSaveError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) {
    return pageShell(
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-zinc-800/60" />
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-zinc-800/40" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-zinc-800/30" />)}
        </div>
        <div className="h-48 rounded-2xl bg-gray-100 dark:bg-zinc-800/20" />
      </div>
    );
  }

  if (error || !hubLeague) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30">
        <p className="text-red-600 dark:text-red-400 mb-3">{error ?? "Hub league not found."}</p>
        <button className="text-sm text-amber-600 hover:underline dark:text-[#F4D06F]" onClick={() => router.back()}>← Go back</button>
      </div>
    );
  }

  const displayName = profileData
    ? `${profileData.firstName} ${profileData.lastName}`
    : sleeperUserInfo?.display_name ?? "Manager";
  const initials = profileData
    ? `${profileData.firstName[0]}${profileData.lastName[0]}`
    : (sleeperUserInfo?.display_name?.[0]?.toUpperCase() ?? "?");
  const avatarUrl = profileData?.profileImage
    ? profileData.profileImage
    : sleeperUserInfo?.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${sleeperUserInfo.avatar}`
    : null;
  const mp = managerProfile;
  const currentYear = new Date().getFullYear().toString();
  const completedAwards = awards.filter((a) => a.season !== currentYear);
  const completedSeasonStats = seasonStats.filter((s) => s.season !== currentYear);
  const totalPF = completedSeasonStats.reduce((s, ss) => s + ss.pointsFor, 0);
  const totalPA = completedSeasonStats.reduce((s, ss) => s + ss.pointsAgainst, 0);

  const rankStyle = hubRank ? (TIER_STYLES[hubRank.tier] ?? TIER_STYLES.Rookie) : null;

  return pageShell(
    <>
      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:border-zinc-800/70 dark:bg-black/40 dark:text-zinc-400">
          <FiStar className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
          {isViewingOther ? `${displayName}'s Franchise` : "My Franchise"} · {hubLeague.name}
        </div>
        {!isViewingOther && !editing && (
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            <FiEdit2 className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* ─── Manager Picker ─────────────────────────── */}
      {sleeperUsers.length > 1 && (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Managers</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* "My Franchise" pill */}
            <button
              onClick={() => setViewingSleeperUserId(null)}
              className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                !viewingSleeperUserId
                  ? "border-[#F4D06F]/50 bg-[#F4D06F]/10"
                  : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40"
              }`}
            >
              <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700/60 shrink-0 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                Me
              </div>
              <p className={`text-xs font-semibold ${!viewingSleeperUserId ? "text-[#F4D06F]" : "text-zinc-200"}`}>
                My Franchise
              </p>
            </button>

            {sleeperUsers.map((u) => {
              const isSelected = viewingSleeperUserId === u.user_id;
              const isMe = u.user_id === mySleeperUserId;
              if (isMe) return null;
              return (
                <button
                  key={u.user_id}
                  onClick={() => setViewingSleeperUserId(u.user_id)}
                  className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                    isSelected
                      ? "border-[#F4D06F]/50 bg-[#F4D06F]/10"
                      : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40"
                  }`}
                >
                  {u.avatar ? (
                    <img
                      src={`https://sleepercdn.com/avatars/thumbs/${u.avatar}`}
                      alt={u.display_name}
                      className="h-7 w-7 rounded-full object-cover border border-zinc-700/60 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700/60 shrink-0 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                      {u.display_name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <p className={`text-xs font-semibold max-w-[90px] truncate ${isSelected ? "text-[#F4D06F]" : "text-zinc-200"}`}>
                    {u.display_name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Edit Panel ─────────────────────────────── */}
      {editing && !isViewingOther && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 space-y-5 dark:border-zinc-700/60 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold hub-text-primary">Edit Manager Profile</p>
            <button onClick={cancelEdit} className="hub-text-muted hover:hub-text-secondary"><FiX className="h-4 w-4" /></button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest hub-text-muted">Bio</label>
            <textarea
              rows={3}
              maxLength={280}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400 resize-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
              placeholder="Tell your league who you are…"
              value={draft.bio ?? ""}
              onChange={(e) => setField("bio", e.target.value)}
            />
            <p className="text-right text-[11px] hub-text-muted">{(draft.bio ?? "").length}/280</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CARD_CONFIG.map((card) => (
              <div key={card.key} className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest hub-text-muted">{card.label}</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                  value={(draft[card.key] as string) ?? ""}
                  onChange={(e) => setField(card.key, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {card.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 outline-none focus:border-gray-300 dark:border-zinc-700/50 dark:bg-zinc-900/60 dark:text-zinc-400 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
                  placeholder={card.subPlaceholder}
                  value={(draft[card.subKey] as string) ?? ""}
                  onChange={(e) => setField(card.subKey, e.target.value)}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest hub-text-muted">Rival</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                value={draft.rival ?? ""}
                onChange={(e) => setField("rival", e.target.value)}
              >
                <option value="">— Select —</option>
                {rivalOptions.map((m) => (
                  <option key={m.userId} value={m.displayName}>{m.displayName} ({m.record})</option>
                ))}
              </select>
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 outline-none focus:border-gray-300 dark:border-zinc-700/50 dark:bg-zinc-900/60 dark:text-zinc-400 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
                placeholder="e.g. 0-5 all time, it haunts me"
                value={draft.rivalSub ?? ""}
                onChange={(e) => setField("rivalSub", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest hub-text-muted">Favorite Player</label>
              <PlayerSearch value={draftPlayer} onChange={setDraftPlayer} />
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 outline-none focus:border-gray-300 dark:border-zinc-700/50 dark:bg-zinc-900/60 dark:text-zinc-400 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
                placeholder="e.g. The GOAT receiver"
                value={draft.favoritePlayerSub ?? ""}
                onChange={(e) => setField("favoritePlayerSub", e.target.value)}
              />
            </div>
          </div>

          {saveError && <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-[#F4D06F] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#e8c45c] disabled:opacity-50 transition-colors"
            >
              <FiCheck className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEdit} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Profile card ───────────────────────────── */}
      <div className="mb-6 flex flex-col items-center hub-card px-5 py-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-28 w-28 rounded-full object-cover ring-4 ring-gray-200 dark:ring-zinc-700" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-200 text-4xl font-black text-gray-400 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-zinc-400">
            {initials}
          </div>
        )}
        <p className="mt-4 text-lg font-bold hub-text-primary">{displayName}</p>

        {/* LeagueShelf Rank badge */}
        {hubRank && hubRank.tier !== "Unranked" && rankStyle && (
          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${rankStyle.bg} ${rankStyle.border}`}>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${rankStyle.text}`}>{hubRank.tier}</span>
            {hubRank.score !== null && (
              <span className={`text-[11px] opacity-60 ${rankStyle.text}`}>· {hubRank.score} avg</span>
            )}
            <span className={`text-[10px] opacity-50 ${rankStyle.text}`}>({hubRank.seasons}s)</span>
          </div>
        )}

        {mp.bio ? (
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed hub-text-secondary">{mp.bio}</p>
        ) : !isViewingOther ? (
          <button onClick={openEdit} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors dark:text-zinc-600 dark:hover:text-zinc-400">+ Add a bio</button>
        ) : null}

        {(commissionerName || hubLeague.owner) && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {commissionerName && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-[#F4D06F]/20 dark:bg-[#F4D06F]/5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-black text-amber-700 dark:bg-[#F4D06F]/15 dark:text-[#F4D06F]">C</div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-600/80 dark:text-[#F4D06F]/60">Commissioner</p>
                  <p className="text-xs font-bold hub-text-primary">{commissionerName}</p>
                </div>
              </div>
            )}
            {hubLeague.owner && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-700/60 dark:bg-zinc-800/40">
                {hubLeague.owner.profileImage ? (
                  <img src={hubLeague.owner.profileImage} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-gray-300 dark:ring-zinc-600" />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-black text-gray-500 dark:bg-zinc-700 dark:text-zinc-300">
                    {hubLeague.owner.firstName[0]}{hubLeague.owner.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest hub-text-muted">Hub Owner</p>
                  <p className="text-xs font-bold hub-text-primary">{hubLeague.owner.firstName} {hubLeague.owner.lastName}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── No Hub account notice ───────────────────── */}
      {!hasHubProfile && isViewingOther && (
        <div className="mb-6 rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-4 py-3 text-center">
          <p className="text-xs text-zinc-400">This manager hasn't joined LeagueShelf yet.</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Sleeper stats are still available below.</p>
        </div>
      )}

      {/* ─── Personality cards ───────────────────────── */}
      {hasHubProfile && <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">

        {CARD_CONFIG.map((card) => {
          const val = mp[card.key];
          const sub = mp[card.subKey];
          return (
            <div key={card.label} className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${card.accent} ${!val ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 opacity-80">
                {card.icon}
                <span className="text-[10px] font-semibold uppercase tracking-widest">{card.label}</span>
              </div>
              <p className="text-sm font-bold hub-text-primary">{val || <span className="italic text-gray-400 dark:text-zinc-600">Not set</span>}</p>
              <p className="text-[11px] hub-text-muted leading-snug">{sub || ""}</p>
            </div>
          );
        })}

        {/* Rival card */}
        {(() => {
          const val = mp.rival;
          const sub = mp.rivalSub;
          const rivalData = rivalOptions.find((r) => r.displayName === val);
          return (
            <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-orange-500 dark:text-orange-400 border-orange-400/30 bg-orange-500/5 ${!val ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 opacity-80">
                <FiUser className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Rival</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-bold hub-text-primary">{val || <span className="italic text-gray-400 dark:text-zinc-600">Not set</span>}</p>
                {rivalData && <span className="text-[11px] font-semibold hub-text-muted">{rivalData.record}</span>}
              </div>
              <p className="text-[11px] hub-text-muted leading-snug">{sub || ""}</p>
            </div>
          );
        })()}

        {/* Favorite Player card */}
        {(() => {
          const playerName = favoritePlayer?.full_name;
          const sub = mp.favoritePlayerSub;
          return (
            <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-purple-500 dark:text-purple-400 border-purple-400/30 bg-purple-500/5 min-w-0 overflow-hidden ${!playerName ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 opacity-80">
                <GiAmericanFootballPlayer className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest truncate">Favorite Player</span>
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <p className="text-sm font-bold hub-text-primary truncate">{playerName || <span className="italic text-gray-400 dark:text-zinc-600">Not set</span>}</p>
                {playerName && favoritePlayer?.position && (
                  <span className="shrink-0 text-[11px] hub-text-muted">{favoritePlayer.position} · {favoritePlayer.team ?? "FA"}</span>
                )}
              </div>
              {sub && <p className="text-[11px] hub-text-muted leading-snug line-clamp-2">{sub}</p>}
            </div>
          );
        })()}
      </div>}

      {/* ─── Divider ─────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-600">League Record</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
      </div>

      {/* ─── Quick stats ────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Seasons", value: completedSeasonStats.length || "—" },
          { label: "Total PF",  value: totalPF > 0 ? totalPF.toFixed(1) : "—" },
          { label: "Total PA",  value: totalPA > 0 ? totalPA.toFixed(1) : "—" },
        ].map((s) => (
          <div key={s.label} className="hub-card p-4 text-center">
            <p className="text-xl font-black hub-text-primary">{s.value}</p>
            <p className="text-[11px] hub-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Trophy Room CTA ────────────────────────── */}
      <Link
        href={`/hub-league/${hubLeagueId}/trophy-room`}
        className="group relative mb-6 flex w-full items-center justify-between overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-8 py-6 transition-all hover:border-amber-300 hover:shadow-lg dark:border-[#F4D06F]/25 dark:bg-gradient-to-r dark:from-[#0d0b06] dark:via-[#141005] dark:to-[#0d0b06] dark:hover:border-[#F4D06F]/50 dark:hover:shadow-[0_0_40px_rgba(244,208,111,0.12)]"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-64 rounded-full bg-amber-200/40 blur-3xl transition-all group-hover:bg-amber-200/60 dark:bg-[#F4D06F]/8 dark:group-hover:bg-[#F4D06F]/14" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600/60 mb-1 dark:text-[#F4D06F]/50">League Legacy</p>
          <h2 className="text-xl font-black text-amber-700 leading-tight dark:text-[#F4D06F]">Trophy Room</h2>
          <p className="mt-1 text-xs hub-text-muted">Every champion, immortalized on a pedestal.</p>
        </div>
        <div className="relative z-10">
          <GiTrophy className="h-12 w-12 text-amber-500 drop-shadow-[0_0_12px_rgba(217,119,6,0.4)] transition-transform group-hover:scale-110 dark:text-[#F4D06F] dark:drop-shadow-[0_0_16px_rgba(244,208,111,0.5)]" />
        </div>
        <div className="relative z-10 flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition-all group-hover:bg-amber-200 dark:border-[#F4D06F]/30 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F] dark:group-hover:bg-[#F4D06F]/20">
            Enter →
          </span>
          <p className="text-[10px] text-gray-400 dark:text-zinc-600">View all seasons</p>
        </div>
      </Link>

      {/* ─── Awards ─────────────────────────────────── */}
      <section className="mb-6 hub-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold hub-text-primary">Your Awards</h2>
            <p className="text-[11px] hub-text-muted mt-0.5">Your trophy case for this hub league</p>
          </div>
          {completedAwards.length > 0 && (
            <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
              {completedAwards.length} award{completedAwards.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {awardsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/40" />)}
          </div>
        ) : completedAwards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GiTrophy className="h-8 w-8 text-gray-300 dark:text-zinc-700 mb-2" />
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">No awards yet.</p>
            <p className="text-[10px] text-gray-300 dark:text-zinc-700 mt-1">
              The commissioner can sync Sleeper data from the hub league overview.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {completedAwards.map((award) => {
              const icon = AWARD_ICON[award.type] ?? <FiAward className="h-6 w-6" />;
              const style = AWARD_STYLE[award.type] ?? "border-gray-200 bg-gray-50 text-gray-500 dark:border-zinc-500/40 dark:bg-zinc-700/20 dark:text-zinc-400";
              return (
                <div key={award.id} className={`flex items-start gap-3 rounded-xl border p-3.5 ${style}`}>
                  <div className="shrink-0 mt-0.5">{icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold">{award.label}</p>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-medium dark:bg-black/20">{award.season}</span>
                      {award.value && (
                        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-medium opacity-70 dark:bg-black/20">{award.value}</span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-70 leading-snug">{award.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Season-by-season ───────────────────────── */}
      <section className="mb-6 hub-card p-5">
        <h2 className="mb-4 text-sm font-semibold hub-text-primary">Season-by-Season</h2>
        {seasonStatsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/40" />
            ))}
          </div>
        ) : !hasSleeperProfile ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">Link your Sleeper account to see season stats.</p>
          </div>
        ) : completedSeasonStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">No completed seasons yet.</p>
            <p className="text-[10px] text-gray-300 dark:text-zinc-700 mt-1">
              The commissioner can sync from the hub league overview.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedSeasonStats.map((s) => {
              const record = s.ties > 0 ? `${s.wins}-${s.losses}-${s.ties}` : `${s.wins}-${s.losses}`;

              const playoffAward = completedAwards.find(
                (a) => a.season === s.season && ["champion", "runner_up", "toilet_bowl"].includes(a.type)
              );

              const finish = playoffAward
                ? playoffAward.type === "champion"
                  ? "Champion"
                  : playoffAward.type === "runner_up"
                  ? "Runner-up"
                  : "Toilet Bowl"
                : s.rank != null
                ? `${s.rank}${ordinal(s.rank)}`
                : "—";

              const finishColor = playoffAward?.type === "champion"
                ? "text-amber-600 dark:text-[#F4D06F]"
                : playoffAward?.type === "runner_up"
                ? "text-gray-500 dark:text-zinc-400"
                : playoffAward?.type === "toilet_bowl"
                ? "text-amber-800 dark:text-amber-700"
                : s.rank != null && s.rank <= 3
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-zinc-400";

              return (
                <div key={s.season} className="hub-inner-card rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold hub-text-primary">{s.season}</span>
                    <span className={`text-xs font-semibold ${finishColor}`}>{finish}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] hub-text-muted">
                    <span>{record}</span>
                    <span>PF {s.pointsFor.toFixed(1)}</span>
                    <span>PA {s.pointsAgainst.toFixed(1)}</span>
                    <span>↑ {s.highWeek.toFixed(1)}</span>
                    <span>↓ {s.lowWeek.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Head-to-head ───────────────────────────── */}
      <section className="hub-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold hub-text-primary">Head-to-Head</h2>
            <p className="text-[11px] hub-text-muted mt-0.5">
              {h2hHistorical ? "All-time record vs. each opponent" : "Current season only — re-sync for full history"}
            </p>
          </div>
          {!h2hHistorical && (
            <span className="shrink-0 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
              Re-sync needed
            </span>
          )}
        </div>

        {h2hLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-zinc-800/40" />
            <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-zinc-800/40" />
          </div>
        ) : h2hRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">No head-to-head data yet.</p>
            <p className="text-[10px] text-gray-300 dark:text-zinc-700 mt-1">
              The hub owner can sync from the overview page.
            </p>
          </div>
        ) : (() => {
          const opponent = h2hRecords.find((r) => r.opponentUserId === selectedOpponentId) ?? h2hRecords[0];
          const trend = opponent.wins > opponent.losses ? "up" : opponent.wins < opponent.losses ? "down" : "flat";
          const myInitials = profileData ? `${profileData.firstName[0]}${profileData.lastName[0]}` : "?";
          const oppInitials = opponent.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div className="space-y-4">
              {/* Opponent selector */}
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
                value={selectedOpponentId ?? ""}
                onChange={(e) => setSelectedOpponentId(e.target.value)}
              >
                {h2hRecords.map((r) => (
                  <option key={r.opponentUserId} value={r.opponentUserId}>
                    {r.isRetired ? "🏁 " : ""}{r.displayName} — {r.wins}-{r.losses}{r.ties > 0 ? `-${r.ties}` : ""}
                  </option>
                ))}
              </select>

              {/* Madden-style matchup card */}
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-zinc-700/60 dark:from-zinc-900 dark:to-zinc-800/80">
                {/* Background accent */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-48 rounded-full bg-gray-200/60 blur-3xl dark:bg-zinc-700/40" />
                </div>

                <div className="relative z-10 flex items-center justify-between gap-2 px-6 py-6">
                  {/* My side */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    {profileData?.profileImage ? (
                      <img
                        src={profileData.profileImage}
                        alt={displayName}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-300 dark:ring-zinc-600"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-lg font-black text-gray-500 ring-2 ring-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-zinc-600">
                        {myInitials}
                      </div>
                    )}
                    <p className="max-w-[90px] text-center text-xs font-semibold hub-text-primary leading-tight line-clamp-2">{displayName}</p>
                  </div>

                  {/* Record center */}
                  <div className="flex flex-col items-center gap-1 px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] hub-text-muted">All-time</p>
                    <div className={`flex items-baseline gap-1.5 ${TREND_STYLE[trend]}`}>
                      <span className="text-4xl font-black tabular-nums leading-none">{opponent.wins}</span>
                      <span className="text-xl font-black text-gray-400 dark:text-zinc-500">-</span>
                      <span className="text-4xl font-black tabular-nums leading-none">{opponent.losses}</span>
                      {opponent.ties > 0 && (
                        <>
                          <span className="text-xl font-black text-gray-400 dark:text-zinc-500">-</span>
                          <span className="text-4xl font-black tabular-nums leading-none">{opponent.ties}</span>
                        </>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] font-semibold ${TREND_STYLE[trend]}`}>
                      {TREND_ICON[trend]}
                      <span>{trend === "up" ? "Winning series" : trend === "down" ? "Losing series" : "Even series"}</span>
                    </div>
                    <p className="mt-1 text-[10px] hub-text-muted">{opponent.played} game{opponent.played !== 1 ? "s" : ""} played</p>
                  </div>

                  {/* Opponent side */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative">
                      {opponent.opponentAvatar ? (
                        <img
                          src={opponent.opponentAvatar}
                          alt={opponent.displayName}
                          className={`h-16 w-16 rounded-full object-cover ring-2 ${opponent.isRetired ? "ring-gray-300 grayscale opacity-70 dark:ring-zinc-700" : "ring-gray-300 dark:ring-zinc-600"}`}
                        />
                      ) : (
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-black ring-2 ${opponent.isRetired ? "bg-gray-100 text-gray-400 ring-gray-200 opacity-70 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700" : "bg-gray-200 text-gray-500 ring-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-zinc-600"}`}>
                          {oppInitials}
                        </div>
                      )}
                      {opponent.isRetired && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-500 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white dark:bg-zinc-600">
                          Retired
                        </span>
                      )}
                    </div>
                    <p className={`max-w-[90px] text-center text-xs font-semibold leading-tight line-clamp-2 ${opponent.isRetired ? "text-gray-400 dark:text-zinc-500" : "hub-text-primary"}`}>{opponent.displayName}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </>
  );
}
