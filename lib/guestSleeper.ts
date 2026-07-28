"use client";

import { useCallback, useEffect, useState } from "react";

// A guest's imported Sleeper account, persisted in localStorage so it can be
// reused across every guest tool without signing in.
export type GuestSleeper = {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
};

// Shared league shape used by all the tools (matches each tool's `League` type).
export type MyLeague = {
  id: string;
  name: string;
  role: string;
  latestSeason: { sleeperLeagueId: string; season: string } | null;
};

const STORAGE_KEY = "fh_guest_sleeper";

export function getGuestSleeper(): GuestSleeper | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId ? (parsed as GuestSleeper) : null;
  } catch {
    return null;
  }
}

export function setGuestSleeper(value: GuestSleeper | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  // Let other open tools / components in the same tab react to the change.
  window.dispatchEvent(new Event("fh-guest-sleeper-changed"));
}

// Resolve a Sleeper username → account. Returns null if the username is unknown.
export async function resolveSleeperUser(username: string): Promise<GuestSleeper | null> {
  const u = username.trim();
  if (!u) return null;
  const res = await fetch(`/api/sleeper/user/${encodeURIComponent(u)}`);
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  if (!user?.user_id) return null;
  return {
    userId: user.user_id,
    username: u,
    displayName: user.display_name ?? u,
    avatar: user.avatar ?? null,
  };
}

// Load every league a Sleeper account belongs to, across all seasons Sleeper has
// supported (NFL launched in 2017). Renewed leagues get a new id each season, so
// we collapse each into a single entry — and pick the season that actually has
// rosters, since a brand-new pre-draft season is empty and has nothing to show.
const SLEEPER_FIRST_SEASON = 2017;

export async function loadSleeperLeagues(userId: string): Promise<MyLeague[]> {
  const currentYear = new Date().getFullYear();
  const seasons: number[] = [];
  for (let y = currentYear; y >= SLEEPER_FIRST_SEASON; y--) seasons.push(y);

  const perSeason = await Promise.all(
    seasons.map(async (season) => {
      try {
        const res = await fetch(
          `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`
        );
        const arr = await res.json().catch(() => []);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })
  );

  const all = perSeason.flat().filter((l: any) => l?.league_id);

  // Group a league's yearly instances together. Renewed leagues keep the same
  // name each season, so key by name (falling back to id for unnamed leagues).
  const groups = new Map<string, any[]>();
  for (const l of all) {
    const key = String(l.name ?? "").trim().toLowerCase() || `id:${l.league_id}`;
    const arr = groups.get(key);
    if (arr) arr.push(l);
    else groups.set(key, [l]);
  }

  const leagues: MyLeague[] = [];
  for (const instances of groups.values()) {
    instances.sort((a, b) => Number(b.season) - Number(a.season)); // newest first
    // Prefer the most recent season that has drafted (rosters exist). A fresh
    // pre_draft season has empty rosters, so fall back to the last real one.
    const chosen = instances.find((l) => l.status && l.status !== "pre_draft") ?? instances[0];
    leagues.push({
      id: chosen.league_id,
      name: chosen.name,
      role: "member",
      latestSeason: { sleeperLeagueId: chosen.league_id, season: String(chosen.season) },
    });
  }
  return leagues;
}

type UseMyLeaguesResult = {
  leagues: MyLeague[];
  sleeperUserId: string | null;
  /** True once we know the visitor is not signed in. */
  isGuest: boolean;
  /** The imported guest account, if any. */
  guest: GuestSleeper | null;
  loading: boolean;
  /** Import a Sleeper account by username. Resolves to an error string, or null on success. */
  connect: (username: string) => Promise<string | null>;
  /** Forget the imported guest account. */
  disconnect: () => void;
};

// Shared leagues loader for the tools. Signed-in users get their hub + linked
// Sleeper leagues from the API; guests fall back to an imported Sleeper account.
export function useMyLeagues(): UseMyLeaguesResult {
  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [sleeperUserId, setSleeperUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guest, setGuest] = useState<GuestSleeper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-leagues");
        if (res.status === 401) {
          if (cancelled) return;
          setIsGuest(true);
          const stored = getGuestSleeper();
          if (stored) {
            setGuest(stored);
            setSleeperUserId(stored.userId);
            const ls = await loadSleeperLeagues(stored.userId);
            if (!cancelled) setLeagues(ls);
          }
          return;
        }
        const d = await res.json().catch(() => null);
        if (cancelled || !d) return;
        setLeagues(d.leagues ?? []);
        setSleeperUserId(d.sleeperUserId ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (username: string): Promise<string | null> => {
    const account = await resolveSleeperUser(username);
    if (!account) return "Sleeper username not found";
    const ls = await loadSleeperLeagues(account.userId);
    if (ls.length === 0) return "No recent leagues found for that account";
    setGuestSleeper(account);
    setGuest(account);
    setSleeperUserId(account.userId);
    setLeagues(ls);
    return null;
  }, []);

  const disconnect = useCallback(() => {
    setGuestSleeper(null);
    setGuest(null);
    setSleeperUserId(null);
    setLeagues([]);
  }, []);

  return { leagues, sleeperUserId, isGuest, guest, loading, connect, disconnect };
}
