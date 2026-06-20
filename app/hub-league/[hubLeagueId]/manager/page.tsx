"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueNav } from "../LeagueNav";
import {
  FiShield,
  FiStar,
  FiRepeat,
  FiUser,
  FiTarget,
  FiEdit2,
  FiX,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import { GiAmericanFootballPlayer } from "react-icons/gi";

// ─── Types ─────────────────────────────────────────────────
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

type RivalOption = {
  userId: string;
  displayName: string;
  record: string; // "W-L"
};

// ─── Card config ────────────────────────────────────────────
const CARD_CONFIG = [
  {
    key: "playerStyle" as const,
    subKey: "playerStyleSub" as const,
    label: "Player Style",
    options: ["Veteran", "Rookie"],
    subPlaceholder: "e.g. Proven producers over upside",
    icon: <FiShield className="h-4 w-4" />,
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  },
  {
    key: "favoriteAsset" as const,
    subKey: "favoriteAssetSub" as const,
    label: "Favorite Asset",
    options: ["QB", "RB", "WR", "TE", "Picks"],
    subPlaceholder: "e.g. Alpha receivers win leagues",
    icon: <FiStar className="h-4 w-4" />,
    accent: "text-[#F4D06F] border-[#F4D06F]/30 bg-[#F4D06F]/5",
  },
  {
    key: "tradeActivity" as const,
    subKey: "tradeActivitySub" as const,
    label: "Trade Desire",
    options: ["Active", "Maybe", "Not Active"],
    subPlaceholder: "e.g. Always looking to deal",
    icon: <FiRepeat className="h-4 w-4" />,
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  },
  {
    key: "mode" as const,
    subKey: "modeSub" as const,
    label: "Mode",
    options: ["Rebuild", "Win Now"],
    subPlaceholder: "e.g. No rebuilds, ever",
    icon: <FiTarget className="h-4 w-4" />,
    accent: "text-red-400 border-red-500/30 bg-red-500/5",
  },
];

// ─── Player Search Component ────────────────────────────────
function PlayerSearch({
  value,
  onChange,
}: {
  value: SleeperPlayerResult | null;
  onChange: (p: SleeperPlayerResult | null) => void;
}) {
  const [query, setQuery] = useState(value?.full_name ?? "");
  const [results, setResults] = useState<SleeperPlayerResult[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value?.full_name ?? "");
  }, [value]);

  const search = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sleeper/players/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
    }, 300);
  };

  const pick = (p: SleeperPlayerResult) => {
    onChange(p);
    setQuery(p.full_name ?? "");
    setResults([]);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
        <FiSearch className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
          placeholder="Search player…"
          value={query}
          onChange={(e) => search(e.target.value)}
        />
        {value && (
          <button onClick={clear} className="text-zinc-500 hover:text-zinc-300">
            <FiX className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors"
                onClick={() => pick(p)}
              >
                <span className="font-medium text-zinc-200">{p.full_name}</span>
                <span className="ml-auto text-[11px] text-zinc-500">
                  {p.position} · {p.team ?? "FA"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ManagerPage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

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

  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    if (!hubLeagueId || hasFetched.current) return;
    hasFetched.current = true;
    try {
      const [hubRes, profileRes] = await Promise.all([
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

      if (profileRes.ok) {
        const pd = await profileRes.json();
        setProfileData(pd.profile ?? null);
        setManagerProfile(pd.managerProfile ?? {});
        setFavoritePlayer(pd.favoritePlayer ?? null);
      }

      // Fetch Sleeper users + rosters across ALL seasons to build all-time records
      const seasons = league?.seasons ?? [];
      if (seasons.length > 0) {
        // Get users from the most recent season (names don't change much)
        const latestLeagueId = seasons[0].sleeperLeagueId;

        // Fetch users and rosters for every season in parallel
        const [usersRes, ...rosterResults] = await Promise.all([
          fetch(`/api/sleeper/league/${latestLeagueId}/users`),
          ...seasons.map((s) => fetch(`/api/sleeper/rosters/${s.sleeperLeagueId}`)),
        ]);

        if (usersRes.ok) {
          const users: { user_id: string; display_name: string; is_owner: boolean }[] = await usersRes.json();

          // Commissioner is the user with is_owner: true
          const commUser = users.find((u) => u.is_owner);
          if (commUser) setCommissionerName(commUser.display_name);

          // Aggregate wins/losses across all seasons
          const totals = new Map<string, { wins: number; losses: number }>();

          await Promise.all(
            rosterResults.map(async (res) => {
              if (!res.ok) return;
              const rosters: { owner_id: string; settings: { wins: number; losses: number } }[] = await res.json();
              for (const r of rosters) {
                if (!r.owner_id) continue;
                const prev = totals.get(r.owner_id) ?? { wins: 0, losses: 0 };
                totals.set(r.owner_id, {
                  wins: prev.wins + (r.settings?.wins ?? 0),
                  losses: prev.losses + (r.settings?.losses ?? 0),
                });
              }
            })
          );

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
  }, [hubLeagueId]);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => {
    setDraft({ ...managerProfile });
    setDraftPlayer(favoritePlayer);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setSaveError(null); };

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

  const setField = (key: keyof ManagerProfile, val: string) => {
    setDraft((d) => ({ ...d, [key]: val }));
  };

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
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-zinc-800/60" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-800/40" />)}
        </div>
        <div className="h-64 rounded-2xl bg-zinc-800/30" />
      </div>
    );
  }

  if (error || !hubLeague) {
    return pageShell(
      <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-red-400 mb-3">{error ?? "Hub league not found."}</p>
        <button className="text-sm text-[#F4D06F] hover:underline" onClick={() => router.back()}>
          ← Go back
        </button>
      </div>
    );
  }

  const displayName = profileData ? `${profileData.firstName} ${profileData.lastName}` : "Manager";
  const initials = profileData ? `${profileData.firstName[0]}${profileData.lastName[0]}` : "?";
  const mp = managerProfile;

  return pageShell(
    <>
      {/* ─── Header ─────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/70 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">
          <FiStar className="h-3 w-3 text-[#F4D06F]" />
          Manager · {hubLeague.name}
        </div>
        {!editing && (
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <FiEdit2 className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* ─── Edit Panel ─────────────────────────────── */}
      {editing && (
        <div className="mb-6 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Edit Manager Profile</p>
            <button onClick={cancelEdit} className="text-zinc-500 hover:text-zinc-300">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Bio
            </label>
            <textarea
              rows={3}
              maxLength={280}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 resize-none"
              placeholder="Tell your league who you are…"
              value={draft.bio ?? ""}
              onChange={(e) => setField("bio", e.target.value)}
            />
            <p className="text-right text-[11px] text-zinc-600">{(draft.bio ?? "").length}/280</p>
          </div>

          {/* Personality cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CARD_CONFIG.map((card) => (
              <div key={card.key} className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  {card.label}
                </label>
                <select
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                  value={(draft[card.key] as string) ?? ""}
                  onChange={(e) => setField(card.key, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {card.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 placeholder-zinc-600 outline-none focus:border-zinc-500"
                  placeholder={card.subPlaceholder}
                  value={(draft[card.subKey] as string) ?? ""}
                  onChange={(e) => setField(card.subKey, e.target.value)}
                />
              </div>
            ))}

            {/* Rival — from Sleeper league users */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Rival
              </label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                value={draft.rival ?? ""}
                onChange={(e) => setField("rival", e.target.value)}
              >
                <option value="">— Select —</option>
                {rivalOptions.map((m) => (
                  <option key={m.userId} value={m.displayName}>
                    {m.displayName} ({m.record})
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 placeholder-zinc-600 outline-none focus:border-zinc-500"
                placeholder="e.g. 0-5 all time, it haunts me"
                value={draft.rivalSub ?? ""}
                onChange={(e) => setField("rivalSub", e.target.value)}
              />
            </div>

            {/* Favorite Player */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Favorite Player
              </label>
              <PlayerSearch value={draftPlayer} onChange={setDraftPlayer} />
              <input
                className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 placeholder-zinc-600 outline-none focus:border-zinc-500"
                placeholder="e.g. The GOAT receiver"
                value={draft.favoritePlayerSub ?? ""}
                onChange={(e) => setField("favoritePlayerSub", e.target.value)}
              />
            </div>
          </div>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-[#F4D06F] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#e8c45c] disabled:opacity-50 transition-colors"
            >
              <FiCheck className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Profile ────────────────────────────────── */}
      <div className="mb-6 flex flex-col items-center hub-card px-5 py-8">
        {profileData?.profileImage ? (
          <img
            src={profileData.profileImage}
            alt={displayName}
            className="h-28 w-28 rounded-full object-cover ring-4 ring-zinc-700"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-700 text-4xl font-black text-zinc-400">
            {initials}
          </div>
        )}
        <p className="mt-4 text-lg font-bold text-gray-900 dark:text-zinc-100">{displayName}</p>
        {mp.bio ? (
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-gray-500 dark:text-zinc-400">{mp.bio}</p>
        ) : (
          <button onClick={openEdit} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            + Add a bio
          </button>
        )}
      </div>

      {/* ─── League roles ───────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-3">
        {commissionerName && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-3.5 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4D06F]/15 text-[11px] font-black text-[#F4D06F]">
              C
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F4D06F]/60">Commissioner</p>
              <p className="text-sm font-bold text-zinc-100">{commissionerName}</p>
            </div>
          </div>
        )}
        {hubLeague.owner && (
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-3.5 py-2.5">
            {hubLeague.owner.profileImage ? (
              <img
                src={hubLeague.owner.profileImage}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-zinc-600"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-black text-zinc-300">
                {hubLeague.owner.firstName[0]}{hubLeague.owner.lastName[0]}
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Hub Owner</p>
              <p className="text-sm font-bold text-zinc-100">{hubLeague.owner.firstName} {hubLeague.owner.lastName}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Personality cards ───────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CARD_CONFIG.map((card) => {
          const val = mp[card.key];
          const sub = mp[card.subKey];
          return (
            <div
              key={card.label}
              className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${card.accent} ${!val ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-1.5 opacity-80">
                {card.icon}
                <span className="text-[10px] font-semibold uppercase tracking-widest">{card.label}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                {val || <span className="italic text-zinc-600">Not set</span>}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug">{sub || ""}</p>
            </div>
          );
        })}

        {/* Rival card */}
        {(() => {
          const val = mp.rival;
          const sub = mp.rivalSub;
          // Look up their current record from rivalOptions
          const rivalData = rivalOptions.find((r) => r.displayName === val);
          return (
            <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-orange-400 border-orange-500/30 bg-orange-500/5 ${!val ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 opacity-80">
                <FiUser className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Rival</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                  {val || <span className="italic text-zinc-600">Not set</span>}
                </p>
                {rivalData && (
                  <span className="text-[11px] font-semibold text-zinc-500">{rivalData.record}</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug">{sub || ""}</p>
            </div>
          );
        })()}

        {/* Favorite Player card */}
        {(() => {
          const playerName = favoritePlayer?.full_name;
          const sub = mp.favoritePlayerSub;
          return (
            <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-purple-400 border-purple-500/30 bg-purple-500/5 min-w-0 overflow-hidden ${!playerName ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 opacity-80">
                <GiAmericanFootballPlayer className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest truncate">Favorite Player</span>
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                  {playerName || <span className="italic text-zinc-600">Not set</span>}
                </p>
                {playerName && favoritePlayer?.position && (
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {favoritePlayer.position} · {favoritePlayer.team ?? "FA"}
                  </span>
                )}
              </div>
              {sub && <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{sub}</p>}
            </div>
          );
        })()}
      </div>
    </>
  );
}
