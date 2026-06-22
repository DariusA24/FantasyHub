"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  FiLoader,
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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SEASONS = [
  { season: "2024", record: "11-2", finish: "1st", pointsFor: 1842.6, pointsAgainst: 1601.3, highWeek: 198.4, lowWeek: 87.2, finish_color: "text-amber-600 dark:text-[#F4D06F]" },
  { season: "2023", record: "6-7",  finish: "8th", pointsFor: 1544.2, pointsAgainst: 1688.9, highWeek: 172.1, lowWeek: 64.8, finish_color: "text-gray-500 dark:text-zinc-400" },
];

const MOCK_RIVALRIES = [
  { name: "CommishDave", record: "4-2", trend: "up" },
  { name: "FantasyGuru", record: "3-3", trend: "flat" },
  { name: "TheRealMVP",  record: "1-5", trend: "down" },
];

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

// ─── Sync New Season Modal ────────────────────────────────────────────────────

function SyncNewSeasonModal({ hubLeagueId, onClose, onSuccess }: { hubLeagueId: string; onClose: () => void; onSuccess: () => void }) {
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalCount: number } | null>(null);

  async function handleSync() {
    setComputing(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/awards/compute-all`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to sync awards");
      setResult({ totalCount: data.totalCount ?? 0 });
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#0a0c14]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold hub-text-primary">Sync New Season</h3>
          <button onClick={onClose} className="hub-text-muted hover:hub-text-secondary transition-colors">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        {result ? (
          <div className="text-center py-4">
            <GiTrophy className="h-10 w-10 text-amber-500 dark:text-[#F4D06F] mx-auto mb-3" />
            <p className="text-sm font-semibold hub-text-primary mb-1">Awards synced!</p>
            <p className="text-[11px] hub-text-muted mb-4">
              {result.totalCount} award{result.totalCount !== 1 ? "s" : ""} computed across all seasons.
            </p>
            <button
              onClick={onClose}
              className="rounded-xl border border-amber-400/30 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-100 transition-all dark:border-[#F4D06F]/30 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F] dark:hover:bg-[#F4D06F]/20"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] hub-text-muted mb-5">
              Pulls the latest data from Sleeper for all seasons and recomputes every award. Run this once after each season ends.
            </p>
            {error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">{error}</p>
            )}
            <button
              onClick={handleSync}
              disabled={computing}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:border-[#F4D06F]/30 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F] dark:hover:bg-[#F4D06F]/20"
            >
              {computing
                ? <><FiLoader className="h-4 w-4 animate-spin" />Syncing all seasons…</>
                : <><GiTrophy className="h-4 w-4" />Sync Awards</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyFranchisePage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const [loading, setLoading] = useState(true);
  const [hubLeague, setHubLeague] = useState<HubLeagueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

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
  const [showSyncModal, setShowSyncModal] = useState(false);

  const hasFetched = useRef(false);

  const fetchAwards = useCallback(async (profileId: number) => {
    setAwardsLoading(true);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/awards?profileId=${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setAwards(data.awards ?? []);
      }
    } catch { /* non-critical */ } finally {
      setAwardsLoading(false);
    }
  }, [hubLeagueId]);

  const load = useCallback(async () => {
    if (!hubLeagueId || hasFetched.current) return;
    hasFetched.current = true;
    try {
      const [hubRes, managerRes] = await Promise.all([
        fetch(`/api/hub-leagues/${hubLeagueId}`),
        fetch(`/api/hub-leagues/${hubLeagueId}/manager-profile`),
      ]);

      if (!hubRes.ok) {
        const d = await hubRes.json().catch(() => ({}));
        setError(d.error ?? "Failed to load hub league.");
        return;
      }

      const hubData = await hubRes.json();
      const league: HubLeagueData = hubData.hubLeague ?? null;
      setHubLeague(league);
      setIsOwner(hubData.isOwner ?? false);

      if (managerRes.ok) {
        const md = await managerRes.json();
        const p: ProfileData | null = md.profile ?? null;
        setProfileData(p);
        setManagerProfile(md.managerProfile ?? {});
        setFavoritePlayer(md.favoritePlayer ?? null);
        if (p?.id) fetchAwards(p.id);
      }

      const seasons = league?.seasons ?? [];
      if (seasons.length > 0) {
        const latestLeagueId = seasons[0].sleeperLeagueId;
        const [usersRes, ...rosterResults] = await Promise.all([
          fetch(`/api/sleeper/league/${latestLeagueId}/users`),
          ...seasons.map((s) => fetch(`/api/sleeper/rosters/${s.sleeperLeagueId}`)),
        ]);

        if (usersRes.ok) {
          const users: { user_id: string; display_name: string; is_owner: boolean }[] = await usersRes.json();
          const commUser = users.find((u) => u.is_owner);
          if (commUser) setCommissionerName(commUser.display_name);

          const totals = new Map<string, { wins: number; losses: number }>();
          await Promise.all(rosterResults.map(async (res) => {
            if (!res.ok) return;
            const rosters: { owner_id: string; settings: { wins: number; losses: number } }[] = await res.json();
            for (const r of rosters) {
              if (!r.owner_id) continue;
              const prev = totals.get(r.owner_id) ?? { wins: 0, losses: 0 };
              totals.set(r.owner_id, { wins: prev.wins + (r.settings?.wins ?? 0), losses: prev.losses + (r.settings?.losses ?? 0) });
            }
          }));

          setRivalOptions(
            users
              .filter((u) => u.user_id && u.display_name)
              .map((u) => {
                const t = totals.get(u.user_id) ?? { wins: 0, losses: 0 };
                return { userId: u.user_id, displayName: u.display_name, record: `${t.wins}-${t.losses}` };
              })
          );
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [hubLeagueId, fetchAwards]);

  useEffect(() => { load(); }, [load]);

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

  const displayName = profileData ? `${profileData.firstName} ${profileData.lastName}` : "Manager";
  const initials = profileData ? `${profileData.firstName[0]}${profileData.lastName[0]}` : "?";
  const mp = managerProfile;
  const totalPF = MOCK_SEASONS.reduce((s, ss) => s + ss.pointsFor, 0);
  const totalPA = MOCK_SEASONS.reduce((s, ss) => s + ss.pointsAgainst, 0);

  return pageShell(
    <>
      {/* ─── Sync Modal ─────────────────────────────── */}
      {showSyncModal && (
        <SyncNewSeasonModal
          hubLeagueId={hubLeagueId}
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => profileData?.id && fetchAwards(profileData.id)}
        />
      )}

      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:border-zinc-800/70 dark:bg-black/40 dark:text-zinc-400">
          <FiStar className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
          My Franchise · {hubLeague.name}
        </div>
        {!editing && (
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            <FiEdit2 className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* ─── Edit Panel ─────────────────────────────── */}
      {editing && (
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
        {profileData?.profileImage ? (
          <img src={profileData.profileImage} alt={displayName} className="h-28 w-28 rounded-full object-cover ring-4 ring-gray-200 dark:ring-zinc-700" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-200 text-4xl font-black text-gray-400 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-zinc-400">
            {initials}
          </div>
        )}
        <p className="mt-4 text-lg font-bold hub-text-primary">{displayName}</p>
        {mp.bio ? (
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed hub-text-secondary">{mp.bio}</p>
        ) : (
          <button onClick={openEdit} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors dark:text-zinc-600 dark:hover:text-zinc-400">+ Add a bio</button>
        )}

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

      {/* ─── Personality cards ───────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      </div>

      {/* ─── Divider ─────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-600">League Record</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
      </div>

      {/* ─── Quick stats ────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Seasons", value: MOCK_SEASONS.length },
          { label: "Total PF",  value: totalPF.toFixed(1) },
          { label: "Total PA",  value: totalPA.toFixed(1) },
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
          <div className="flex items-center gap-2">
            {awards.length > 0 && (
              <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
                {awards.length} award{awards.length !== 1 ? "s" : ""}
              </span>
            )}
            {isOwner && (
              <button
                onClick={() => setShowSyncModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600 hover:bg-amber-100 transition-all dark:border-[#F4D06F]/30 dark:bg-[#F4D06F]/10 dark:text-[#F4D06F] dark:hover:bg-[#F4D06F]/20"
              >
                <GiTrophy className="h-3 w-3" />
                Sync New Season
              </button>
            )}
          </div>
        </div>

        {awardsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/40" />)}
          </div>
        ) : awards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GiTrophy className="h-8 w-8 text-gray-300 dark:text-zinc-700 mb-2" />
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">No awards yet.</p>
            {isOwner && (
              <p className="text-[10px] text-gray-300 dark:text-zinc-700 mt-1">
                Awards are auto-generated when the hub league is created. Use "Sync New Season" after a season ends.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {awards.map((award) => {
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
        <div className="space-y-3">
          {MOCK_SEASONS.map((s) => (
            <div key={s.season} className="hub-inner-card rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold hub-text-primary">{s.season}</span>
                <span className={`text-xs font-semibold ${s.finish_color}`}>{s.finish}</span>
              </div>
              <div className="flex gap-4 text-[11px] hub-text-muted">
                <span>{s.record}</span>
                <span>PF {s.pointsFor.toFixed(1)}</span>
                <span>PA {s.pointsAgainst.toFixed(1)}</span>
                <span>↑ {s.highWeek}</span>
                <span>↓ {s.lowWeek}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Head-to-head ───────────────────────────── */}
      <section className="hub-card p-5">
        <h2 className="mb-4 text-sm font-semibold hub-text-primary">Head-to-Head</h2>
        <div className="space-y-2">
          {MOCK_RIVALRIES.map((r) => (
            <div key={r.name} className="hub-inner-card rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm hub-text-primary">{r.name}</span>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${TREND_STYLE[r.trend]}`}>
                {TREND_ICON[r.trend]}
                {r.record}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
