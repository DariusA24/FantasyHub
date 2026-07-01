"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LeagueNav } from "../LeagueNav";
import {
  FiAward,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
  FiShield,
  FiStar,
  FiRepeat,
  FiUser,
  FiTarget,
} from "react-icons/fi";
import { GiTrophy, GiTie, GiAmericanFootballPlayer } from "react-icons/gi";

// ─── Types ────────────────────────────────────────────────────────────────────

type SleeperUser = { user_id: string; display_name: string; avatar: string | null; is_owner: boolean };

type Roster = {
  roster_id: number;
  owner_id: string;
  settings?: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_decimal?: number };
};

type ManagerProfile = {
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

type FavoritePlayer = { id: string; full_name: string | null; position: string | null; team: string | null } | null;

type Award = {
  id: string;
  season: string;
  type: string;
  label: string;
  description: string;
  value?: string | null;
  week?: number | null;
};

// ─── Personality card config ──────────────────────────────────────────────────

const CARD_CONFIG = [
  {
    key: "playerStyle" as keyof ManagerProfile,
    subKey: "playerStyleSub" as keyof ManagerProfile,
    label: "Player Style",
    icon: <FiShield className="h-4 w-4" />,
    accent: "text-blue-500 dark:text-blue-400 border-blue-500/30 bg-blue-500/5",
  },
  {
    key: "favoriteAsset" as keyof ManagerProfile,
    subKey: "favoriteAssetSub" as keyof ManagerProfile,
    label: "Favorite Asset",
    icon: <FiStar className="h-4 w-4" />,
    accent: "text-amber-600 dark:text-[#F4D06F] border-amber-400/30 dark:border-[#F4D06F]/30 bg-amber-500/5 dark:bg-[#F4D06F]/5",
  },
  {
    key: "tradeActivity" as keyof ManagerProfile,
    subKey: "tradeActivitySub" as keyof ManagerProfile,
    label: "Trade Desire",
    icon: <FiRepeat className="h-4 w-4" />,
    accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  },
  {
    key: "mode" as keyof ManagerProfile,
    subKey: "modeSub" as keyof ManagerProfile,
    label: "Mode",
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
  biggest_blowout:     <FiAward className="h-6 w-6" />,
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicFranchisePage() {
  const params = useParams();
  const leagueId = String(params?.leagueId ?? "");

  const [sleeperUsers, setSleeperUsers] = useState<SleeperUser[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissionerName, setCommissionerName] = useState<string | null>(null);

  // Hub league data
  const [hubLeagueId, setHubLeagueId] = useState<string | null>(null);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile>({});
  const [favoritePlayer, setFavoritePlayer] = useState<FavoritePlayer>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Initial data load
  useEffect(() => {
    if (!leagueId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, rostersRes, hubRes] = await Promise.all([
          fetch(`/api/sleeper/league/${leagueId}/users`),
          fetch(`/api/sleeper/rosters/${leagueId}`),
          fetch(`/api/hub-leagues?sleeperLeagueId=${leagueId}`),
        ]);
        if (usersRes.ok) {
          const users: SleeperUser[] = await usersRes.json();
          setSleeperUsers(users);
          const comm = users.find(u => u.is_owner);
          if (comm) setCommissionerName(comm.display_name);
          setViewingUserId(users[0]?.user_id ?? null);
        }
        if (rostersRes.ok) setRosters(await rostersRes.json());
        if (hubRes.ok) {
          const hubData = await hubRes.json();
          const hid = hubData?.hubLeagueSeasons?.[0]?.hubLeagueId ?? null;
          setHubLeagueId(hid);
        }
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leagueId]);

  // Fetch manager profile + awards when viewing user or hubLeagueId changes
  useEffect(() => {
    if (!hubLeagueId || !viewingUserId) {
      setManagerProfile({});
      setFavoritePlayer(null);
      setAwards([]);
      return;
    }
    const fetchProfile = async () => {
      setProfileLoading(true);
      setManagerProfile({});
      setFavoritePlayer(null);
      setAwards([]);
      try {
        const [profileRes, awardsRes] = await Promise.all([
          fetch(`/api/hub-leagues/${hubLeagueId}/manager-profile?sleeperUserId=${viewingUserId}`),
          fetch(`/api/hub-leagues/${hubLeagueId}/awards?sleeperUserId=${viewingUserId}`),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setManagerProfile(data.managerProfile ?? {});
          setFavoritePlayer(data.favoritePlayer ?? null);
        }
        if (awardsRes.ok) {
          const data = await awardsRes.json();
          setAwards(data.awards ?? []);
        }
      } catch { /* non-critical */ } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [hubLeagueId, viewingUserId]);

  const pageShell = (children: React.ReactNode) => (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <LeagueNav />
        {children}
      </div>
    </div>
  );

  if (loading) return pageShell(
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-zinc-800/60" />
      <div className="h-40 rounded-2xl bg-gray-200 dark:bg-zinc-800/40" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-zinc-800/30" />)}
      </div>
    </div>
  );

  if (error) return pageShell(
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30">
      <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
      <button className="text-sm text-amber-600 hover:underline dark:text-[#F4D06F]" onClick={() => window.history.back()}>← Go back</button>
    </div>
  );

  const viewingUser = sleeperUsers.find(u => u.user_id === viewingUserId) ?? sleeperUsers[0] ?? null;
  const viewingRoster = rosters.find(r => r.owner_id === viewingUser?.user_id) ?? null;
  const wins = viewingRoster?.settings?.wins ?? 0;
  const losses = viewingRoster?.settings?.losses ?? 0;
  const ties = viewingRoster?.settings?.ties ?? 0;
  const pf = (viewingRoster?.settings?.fpts ?? 0) + (viewingRoster?.settings?.fpts_decimal ?? 0) / 100;
  const record = ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`;

  const avatarUrl = viewingUser?.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${viewingUser.avatar}`
    : null;
  const initials = viewingUser?.display_name?.[0]?.toUpperCase() ?? "?";
  const mp = managerProfile;
  const currentYear = new Date().getFullYear().toString();
  const completedAwards = awards.filter(a => a.season !== currentYear);

  const hasPersonality = !!(
    mp.playerStyle || mp.favoriteAsset || mp.tradeActivity || mp.mode ||
    mp.rival || favoritePlayer
  );

  return pageShell(
    <>
      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:border-zinc-800/70 dark:bg-black/40 dark:text-zinc-400">
          <FiStar className="h-3 w-3 text-amber-500 dark:text-[#F4D06F]" />
          {viewingUser?.display_name ?? "Manager"}&apos;s Franchise
        </div>
      </div>

      {/* ─── Manager Picker ─────────────────────────── */}
      {sleeperUsers.length > 1 && (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Managers</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sleeperUsers.map(u => {
              const isSelected = viewingUserId === u.user_id;
              const av = u.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null;
              return (
                <button
                  key={u.user_id}
                  onClick={() => setViewingUserId(u.user_id)}
                  className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                    isSelected
                      ? "border-[#F4D06F]/50 bg-[#F4D06F]/10"
                      : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40"
                  }`}
                >
                  {av ? (
                    <img src={av} alt={u.display_name}
                      className="h-7 w-7 rounded-full object-cover border border-zinc-700/60 shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

      {/* ─── Profile card — no bio ───────────────────── */}
      <div className="mb-6 flex flex-col items-center hub-card px-5 py-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt={viewingUser?.display_name ?? "Manager"} className="h-28 w-28 rounded-full object-cover ring-4 ring-gray-200 dark:ring-zinc-700" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-200 text-4xl font-black text-gray-400 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-zinc-400">
            {initials}
          </div>
        )}
        <p className="mt-4 text-lg font-bold hub-text-primary">{viewingUser?.display_name ?? "Manager"}</p>

        {/* Commissioner badge only */}
        {commissionerName && viewingUser?.is_owner && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-[#F4D06F]/20 dark:bg-[#F4D06F]/5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-black text-amber-700 dark:bg-[#F4D06F]/15 dark:text-[#F4D06F]">C</div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-600/80 dark:text-[#F4D06F]/60">Commissioner</p>
              <p className="text-xs font-bold hub-text-primary">{commissionerName}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Personality cards ───────────────────────── */}
      {profileLoading ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-zinc-800/40" />)}
        </div>
      ) : hasPersonality && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CARD_CONFIG.map((card) => {
            const val = mp[card.key] as string | null | undefined;
            const sub = mp[card.subKey] as string | null | undefined;
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
            return (
              <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-orange-500 dark:text-orange-400 border-orange-400/30 bg-orange-500/5 ${!val ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-1.5 opacity-80">
                  <FiUser className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">Rival</span>
                </div>
                <p className="text-sm font-bold hub-text-primary">{val || <span className="italic text-gray-400 dark:text-zinc-600">Not set</span>}</p>
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
      )}

      {/* ─── Divider ─────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-600">Season Record</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
      </div>

      {/* ─── Quick stats ────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Record", value: record },
          { label: "Points For", value: pf > 0 ? pf.toFixed(1) : "—" },
          { label: "Win %", value: (wins + losses + ties) > 0 ? `${Math.round((wins / (wins + losses + ties)) * 100)}%` : "—" },
        ].map(s => (
          <div key={s.label} className="hub-card p-4 text-center">
            <p className="text-xl font-black hub-text-primary">{s.value}</p>
            <p className="text-[11px] hub-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Trophy Room CTA ────────────────────────── */}
      <Link
        href={`/league/${leagueId}/trophy-room`}
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
      {hubLeagueId && (
        <section className="mb-6 hub-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold hub-text-primary">Awards</h2>
              <p className="text-[11px] hub-text-muted mt-0.5">Trophy case for this league</p>
            </div>
            {completedAwards.length > 0 && (
              <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
                {completedAwards.length} award{completedAwards.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {profileLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/40" />)}
            </div>
          ) : completedAwards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GiTrophy className="h-8 w-8 text-gray-300 dark:text-zinc-700 mb-2" />
              <p className="text-[11px] text-gray-400 dark:text-zinc-600">No awards yet.</p>
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
      )}
    </>
  );
}
