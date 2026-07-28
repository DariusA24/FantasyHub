"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiX, FiPlus, FiDollarSign, FiUsers, FiTag, FiAlertCircle,
  FiCheckCircle, FiChevronDown, FiMail, FiExternalLink, FiZap, FiCalendar,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingType   = "open-spot" | "want-out";
type Platform      = "Sleeper" | "ESPN" | "Yahoo" | "NFL" | "Other";
type LeagueFormat  = "Redraft" | "Keeper" | "Dynasty";
type ScoringFormat = "PPR" | "Half-PPR" | "Standard" | "TE Premium";

type Listing = {
  id: string;
  type: ListingType;
  sleeperLeagueId: string | null;
  espnLeagueId: string | null;
  espnSeason: string | null;
  openSpotName: string | null;
  leagueName: string;
  platform: string;
  format: LeagueFormat;
  scoring: string;
  teamCount: number;
  entryFee: number | null;
  spotsAvailable: number | null;
  record: string | null;
  standingPosition: number | null;
  description: string;
  contact: string;
  status: string;
  createdAt: string;
  creator: {
    profileId: number;
    username: string;
    firstName: string;
    lastName: string;
    profileImage: string;
  };
};

type QueueMember = {
  profileId: number;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  joinedAt: string;
};

type QueuePost = {
  id: string;
  leagueName: string;
  platform: string;
  format: string;
  scoring: string;
  teamCount: number;
  entryFee: number | null;
  description: string;
  draftDate: string | null;
  status: string;
  createdAt: string;
  creator: QueueMember;
  members: QueueMember[];
  memberCount: number;
  spotsLeft: number;
  isCreator: boolean;
  hasJoined: boolean;
};

// ─── Helpers for listing display ──────────────────────────────────────────────

const listingPosterName = (l: Listing) =>
  `${l.creator.firstName} ${l.creator.lastName}`.trim() || l.creator.username;

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: Platform[]      = ["Sleeper", "ESPN", "Yahoo", "NFL", "Other"];
const FORMATS: LeagueFormat[]    = ["Redraft", "Keeper", "Dynasty"];
const SCORING: ScoringFormat[]   = ["PPR", "Half-PPR", "Standard", "TE Premium"];
const TEAM_COUNTS                = [8, 10, 12, 14, 16];

const FORMAT_STYLE: Record<LeagueFormat, string> = {
  Redraft: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Keeper:  "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Dynasty: "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-[#F4D06F]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, src, size = "sm", href }: { name: string; src: string | null; size?: "sm" | "md" | "lg"; href?: string }) {
  const dim = size === "lg" ? "h-10 w-10 text-sm" : size === "md" ? "h-9 w-9 text-[11px]" : "h-7 w-7 text-[10px]";
  const inner = src
    ? <img src={src} alt={name} className={`${dim} rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-zinc-950`} />
    : (
      <div className={`${dim} rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 ring-2 ring-white dark:ring-zinc-950 flex items-center justify-center font-bold text-zinc-500 dark:text-zinc-400 shrink-0`}>
        {name[0]?.toUpperCase()}
      </div>
    );
  if (href) {
    return (
      <Link href={href} onClick={(e) => e.stopPropagation()} title={name}
        className="shrink-0 hover:scale-110 hover:z-10 relative transition-transform">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-[#F4D06F]/20";
const selectCls = `${inputCls} cursor-pointer`;

// ─── Create New League Modal ──────────────────────────────────────────────────

function CreateNewLeagueModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (post: QueuePost) => void;
}) {
  const [leagueName, setName]   = useState("");
  const [platform, setPlatform] = useState<Platform>("Sleeper");
  const [format, setFormat]     = useState<LeagueFormat>("Redraft");
  const [scoring, setScoring]   = useState<ScoringFormat>("PPR");
  const [teamCount, setTeams]   = useState<number>(12);
  const [entryFee, setFee]      = useState("");
  const [draftDate, setDraft]   = useState("");
  const [description, setDesc]  = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const canSubmit = leagueName.trim() && description.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/league-market/new-leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName: leagueName.trim(),
          platform, format, scoring,
          teamCount,
          entryFee: entryFee ? Number(entryFee) : null,
          draftDate: draftDate.trim() || null,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      onCreated(data.post);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-[#F4D06F]/10">
              <FiZap className="h-3.5 w-3.5 text-amber-600 dark:text-[#F4D06F]" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Start New League</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition">
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <form id="queue-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">League Name</label>
            <input value={leagueName} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Gridiron Collective" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={selectCls}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as LeagueFormat)} className={selectCls}>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Scoring</label>
              <select value={scoring} onChange={(e) => setScoring(e.target.value as ScoringFormat)} className={selectCls}>
                {SCORING.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Team Count</label>
              <select value={teamCount} onChange={(e) => setTeams(Number(e.target.value))} className={selectCls}>
                {TEAM_COUNTS.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Entry Fee <span className="normal-case font-normal text-zinc-400">(optional)</span>
              </label>
              <div className="relative">
                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input type="number" min="0" value={entryFee} onChange={(e) => setFee(e.target.value)} placeholder="0" className={`${inputCls} pl-8`} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Draft Date <span className="normal-case font-normal text-zinc-400">(optional)</span>
              </label>
              <input value={draftDate} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Mid-August 2026" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Description</label>
            <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={4}
              placeholder="Tell managers what makes this league special — competitiveness, culture, dynasty startup rules, etc."
              className={`${inputCls} resize-none leading-relaxed`} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition">
            Cancel
          </button>
          <button form="queue-form" type="submit" disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
            <FiZap className="h-3.5 w-3.5" />
            {saving ? "Creating…" : "Create League"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({
  post,
  onJoin,
  joining,
}: {
  post: QueuePost;
  onJoin: (id: string) => void;
  joining: boolean;
}) {
  const pct  = Math.round((post.memberCount / post.teamCount) * 100);
  const full = post.status === "full";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/30 p-5 shadow-sm dark:shadow-none flex flex-col gap-4">
      {/* Top row: tags + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${FORMAT_STYLE[post.format as LeagueFormat] ?? "border-zinc-300 text-zinc-500"}`}>
            {post.format}
          </span>
          <span className="rounded-full border border-zinc-200 dark:border-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">
            {post.scoring}
          </span>
          <span className="rounded-full border border-zinc-200 dark:border-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">
            {post.platform}
          </span>
          {full && (
            <span className="rounded-full border border-zinc-400/40 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              Full
            </span>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-zinc-400">{timeAgo(post.createdAt)}</span>
      </div>

      {/* League name + description */}
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{post.leagueName}</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{post.description}</p>
      </div>

      {/* Member avatar stack + progress */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Filled avatars */}
          <div className="flex -space-x-2">
            {post.members.slice(0, 6).map((m) => (
              <Avatar key={m.profileId} name={m.firstName || m.username} src={m.profileImage} size="sm" href={`/manager/${m.username}`} />
            ))}
            {post.memberCount > 6 && (
              <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 ring-2 ring-white dark:ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                +{post.memberCount - 6}
              </div>
            )}
          </div>

          {/* Spots left badge */}
          {full ? (
            <span className="rounded-full border border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
              League Full
            </span>
          ) : (
            <span className="rounded-full border border-amber-400/40 dark:border-[#F4D06F]/25 bg-amber-500/8 dark:bg-[#F4D06F]/8 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-[#F4D06F]">
              {post.spotsLeft} spot{post.spotsLeft !== 1 ? "s" : ""} open
            </span>
          )}
        </div>

        {/* Progress bar + count */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${full ? "bg-zinc-400 dark:bg-zinc-600" : "bg-amber-400 dark:bg-[#F4D06F]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500 shrink-0">
            {post.memberCount} / {post.teamCount}
          </span>
        </div>
      </div>

      {/* Footer: meta + join button */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-3 text-[10px] text-zinc-500 flex-wrap">
          {post.entryFee != null && (
            <span className="inline-flex items-center gap-1">
              <FiDollarSign className="h-3 w-3" />
              ${post.entryFee} entry
            </span>
          )}
          {post.entryFee == null && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              Free to play
            </span>
          )}
          {post.draftDate && (
            <span className="inline-flex items-center gap-1">
              <FiCalendar className="h-3 w-3" />
              {post.draftDate}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FiUsers className="h-3 w-3" />
            {post.teamCount} teams
          </span>
        </div>

        {post.isCreator ? (
          <span className="text-[10px] font-semibold text-amber-600 dark:text-[#F4D06F] bg-amber-500/10 dark:bg-[#F4D06F]/10 px-2.5 py-1 rounded-lg">
            Your league
          </span>
        ) : full && !post.hasJoined ? (
          <span className="text-[10px] font-medium text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
            Full
          </span>
        ) : (
          <button
            onClick={() => onJoin(post.id)}
            disabled={joining}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              post.hasJoined
                ? "border border-zinc-300 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:border-red-300 hover:text-red-500 dark:hover:text-red-400"
                : "bg-amber-500 dark:bg-[#F4D06F] text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] shadow-sm"
            }`}
          >
            {joining ? (
              <span className="h-3 w-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
            ) : post.hasJoined ? (
              <><FiCheckCircle className="h-3 w-3" /> Joined</>
            ) : (
              <><FiPlus className="h-3 w-3" /> Join</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Existing listing modals (unchanged) ──────────────────────────────────────

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: (l: Listing) => void }) {
  const [step, setStep]           = useState<"pick-type" | "form">("pick-type");
  const [listingType, setType]    = useState<ListingType>("open-spot");
  const [leagueName, setName]     = useState("");
  const [platform, setPlatform]   = useState<Platform>("Sleeper");
  const [sleeperLeague, setSleeperLeague] = useState("");
  const [format, setFormat]       = useState<LeagueFormat>("Redraft");
  const [scoring, setScoring]     = useState<ScoringFormat>("PPR");
  const [teamCount, setTeamCount] = useState<number>(12);
  const [entryFee, setFee]        = useState("");
  const [spots, setSpots]         = useState("1");
  const [description, setDesc]    = useState("");
  const [contact, setContact]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  type SleeperLeagueOpt = { leagueId: string; name: string; season: string; totalRosters: number | null };
  type EspnLeagueOpt = { leagueId: string; name: string | null; season: string; teamCount: number | null };
  type SpotTeam = { teamName: string; note?: string };
  const [myLeagues, setMyLeagues]       = useState<SleeperLeagueOpt[]>([]);
  const [leaguesLinked, setLinked]      = useState(true);
  const [leaguesLoading, setLgLoading]  = useState(false);
  const [espnLeagues, setEspnLeagues]   = useState<EspnLeagueOpt[]>([]);
  const [espnLoading, setEspnLoading]   = useState(false);
  const [espnLeagueId, setEspnLeagueId] = useState("");
  const [espnSeason, setEspnSeason]     = useState("");
  const [teams, setTeams]               = useState<SpotTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [openSpotName, setOpenSpot]     = useState("");

  const isSleeper = platform === "Sleeper";
  const isEspn    = platform === "ESPN";

  // Pull the poster's Sleeper leagues once they reach the Sleeper form
  useEffect(() => {
    if (step !== "form" || !isSleeper || myLeagues.length > 0 || leaguesLoading) return;
    setLgLoading(true);
    fetch("/api/league-market/my-sleeper-leagues")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setMyLeagues(d.leagues ?? []); setLinked(d.linked !== false); } })
      .catch(() => {})
      .finally(() => setLgLoading(false));
  }, [step, isSleeper, myLeagues.length, leaguesLoading]);

  // Pull the poster's synced ESPN leagues once they reach the ESPN form
  useEffect(() => {
    if (step !== "form" || !isEspn || espnLeagues.length > 0 || espnLoading) return;
    setEspnLoading(true);
    fetch("/api/espn/leagues")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.leagues) setEspnLeagues(d.leagues); })
      .catch(() => {})
      .finally(() => setEspnLoading(false));
  }, [step, isEspn, espnLeagues.length, espnLoading]);

  function selectLeague(leagueId: string) {
    setSleeperLeague(leagueId);
    setOpenSpot("");
    setTeams([]);
    const lg = myLeagues.find((l) => l.leagueId === leagueId);
    if (lg) {
      setName(lg.name);
      if (lg.totalRosters) setTeamCount(lg.totalRosters);
    }
    if (leagueId) {
      setTeamsLoading(true);
      fetch(`/api/league-market/sleeper-teams?leagueId=${leagueId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.teams) setTeams(d.teams.map((t: any) => ({ teamName: t.teamName, note: t.isOpen ? "open" : undefined })));
        })
        .catch(() => {})
        .finally(() => setTeamsLoading(false));
    }
  }

  function selectEspnLeague(key: string) {
    setEspnLeagueId("");
    setEspnSeason("");
    setOpenSpot("");
    setTeams([]);
    if (!key) return;
    const [leagueId, season] = key.split("|");
    setEspnLeagueId(leagueId);
    setEspnSeason(season);
    const lg = espnLeagues.find((l) => l.leagueId === leagueId && l.season === season);
    if (lg) {
      if (lg.name) setName(lg.name);
      if (lg.teamCount) setTeamCount(lg.teamCount);
    }
    setTeamsLoading(true);
    fetch(`/api/league-market/espn-teams?leagueId=${leagueId}&season=${season}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.teams) setTeams(d.teams.map((t: any) => ({ teamName: t.teamName }))); })
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }

  const isFormValid =
    (leagueName.trim() || (isSleeper && sleeperLeague.trim()) || (isEspn && espnLeagueId)) &&
    description.trim() && contact.trim() &&
    (listingType !== "open-spot" || Number(spots) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/league-market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: listingType,
          leagueName: leagueName.trim() || undefined,
          platform, format, scoring,
          teamCount,
          entryFee: entryFee || null,
          description: description.trim(),
          contact: contact.trim(),
          sleeperLeagueId: isSleeper && sleeperLeague.trim() ? sleeperLeague.trim() : null,
          espnLeagueId: isEspn && espnLeagueId ? espnLeagueId : null,
          espnSeason: isEspn && espnLeagueId ? espnSeason : null,
          openSpotName: listingType === "open-spot" && openSpotName ? openSpotName : null,
          spotsAvailable: listingType === "open-spot" ? Number(spots) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to post listing");
        return;
      }
      onCreated(data.listing);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {step === "pick-type" ? "Post a Listing" : listingType === "open-spot" ? "Open Spot" : "Looking to Exit"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === "pick-type" ? (
            <div className="px-6 py-8 space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">What kind of listing is this?</p>
              <button onClick={() => { setType("open-spot"); setStep("form"); }}
                className="w-full flex items-start gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 p-4 text-left hover:border-amber-400/50 dark:hover:border-[#F4D06F]/40 hover:bg-amber-500/5 transition">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <FiUsers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open Spot</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">You&apos;re a commissioner with an available slot.</p>
                </div>
              </button>
              <button onClick={() => { setType("want-out"); setStep("form"); }}
                className="w-full flex items-start gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 p-4 text-left hover:border-amber-400/50 dark:hover:border-[#F4D06F]/40 hover:bg-amber-500/5 transition">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <FiAlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Want Out</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">You need to leave and want someone to take over your spot.</p>
                </div>
              </button>
            </div>
          ) : (
            <form id="listing-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  League Name {isSleeper && <span className="normal-case font-normal text-zinc-400">(auto-filled from Sleeper if blank)</span>}
                </label>
                <input value={leagueName} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Gridiron Syndicate" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Platform</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={selectCls}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value as LeagueFormat)} className={selectCls}>
                    {FORMATS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Scoring</label>
                  <select value={scoring} onChange={(e) => setScoring(e.target.value as ScoringFormat)} className={selectCls}>
                    {SCORING.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Teams</label>
                  <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className={selectCls}>
                    {TEAM_COUNTS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {isSleeper && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Sleeper League <span className="normal-case font-normal text-zinc-400">(links the public league)</span>
                  </label>
                  {leaguesLoading ? (
                    <div className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800/50" />
                  ) : !leaguesLinked ? (
                    <p className="rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2 text-[11px] text-zinc-500">
                      Link your Sleeper account on your profile to pick one of your leagues.
                    </p>
                  ) : myLeagues.length === 0 ? (
                    <p className="rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2 text-[11px] text-zinc-500">
                      No Sleeper leagues found on your account.
                    </p>
                  ) : (
                    <select value={sleeperLeague} onChange={(e) => selectLeague(e.target.value)} className={selectCls}>
                      <option value="">Choose a league…</option>
                      {myLeagues.map((l) => (
                        <option key={l.leagueId} value={l.leagueId}>
                          {l.name} ({l.season})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">
                    Lets people browse the rosters, history, and champions before they join.
                  </p>
                </div>
              )}

              {isEspn && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    ESPN League <span className="normal-case font-normal text-zinc-400">(links the public league)</span>
                  </label>
                  {espnLoading ? (
                    <div className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800/50" />
                  ) : espnLeagues.length === 0 ? (
                    <p className="rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2 text-[11px] text-zinc-500">
                      Add an ESPN league on your profile to pick one here.
                    </p>
                  ) : (
                    <select
                      value={espnLeagueId ? `${espnLeagueId}|${espnSeason}` : ""}
                      onChange={(e) => selectEspnLeague(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Choose a league…</option>
                      {espnLeagues.map((l) => (
                        <option key={`${l.leagueId}|${l.season}`} value={`${l.leagueId}|${l.season}`}>
                          {l.name ?? `League ${l.leagueId}`} ({l.season})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">
                    Public ESPN leagues let people browse rosters and standings before joining.
                  </p>
                </div>
              )}

              {listingType === "open-spot" && (sleeperLeague || espnLeagueId) && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Which spot is open?
                  </label>
                  {teamsLoading ? (
                    <div className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800/50" />
                  ) : (
                    <select value={openSpotName} onChange={(e) => setOpenSpot(e.target.value)} className={selectCls}>
                      <option value="">Choose the team being handed off…</option>
                      {teams.map((t, i) => (
                        <option key={`${t.teamName}-${i}`} value={t.teamName}>
                          {t.teamName}{t.note ? ` · ${t.note}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Entry Fee <span className="normal-case font-normal text-zinc-400">(optional)</span></label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input type="number" min="0" value={entryFee} onChange={(e) => setFee(e.target.value)} placeholder="0" className={`${inputCls} pl-8`} />
                </div>
              </div>
              {listingType === "open-spot" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Spots Available</label>
                  <select value={spots} onChange={(e) => setSpots(e.target.value)} className={selectCls}>
                    {[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Description</label>
                <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={4}
                  placeholder={listingType === "open-spot" ? "Tell potential managers about the league…" : "Describe your team's assets, why you're leaving…"}
                  className={`${inputCls} resize-none leading-relaxed`} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Contact Info</label>
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Sleeper username, Discord, email…" className={inputCls} />
              </div>
            </form>
          )}
        </div>
        <div className="px-6 pt-3 shrink-0">
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <button type="button" onClick={() => step === "form" ? setStep("pick-type") : onClose()}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition">
            {step === "form" ? "Back" : "Cancel"}
          </button>
          {step === "form" && (
            <button form="listing-form" type="submit" disabled={!isFormValid || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
              <FiCheckCircle className="h-3.5 w-3.5" /> {saving ? "Posting…" : "Post Listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingDetailModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${FORMAT_STYLE[listing.format]}`}>{listing.format}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${listing.type === "open-spot" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"}`}>
              {listing.type === "open-spot" ? "Open Spot" : "Want Out"}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{listing.leagueName}</h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <Avatar name={listingPosterName(listing)} src={listing.creator.profileImage || null} size="sm" href={`/manager/${listing.creator.username}`} />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{listingPosterName(listing)}</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>{timeAgo(listing.createdAt)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Platform",  value: listing.platform },
              { label: "Scoring",   value: listing.scoring },
              { label: "Teams",     value: `${listing.teamCount} teams` },
              { label: "Entry Fee", value: listing.entryFee ? `$${listing.entryFee}` : "Free" },
              ...(listing.type === "open-spot" && listing.spotsAvailable != null
                ? [{ label: "Spots Open", value: `${listing.spotsAvailable}` }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Details</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{listing.description}</p>
          </div>
          {listing.openSpotName && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 mb-0.5">Spot up for grabs</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{listing.openSpotName}</p>
            </div>
          )}
          {(listing.sleeperLeagueId || listing.espnLeagueId) && (
            <Link
              href={
                listing.sleeperLeagueId
                  ? `/league/${listing.sleeperLeagueId}`
                  : `/espn/${listing.espnLeagueId}?season=${listing.espnSeason ?? ""}`
              }
              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 transition hover:bg-emerald-500/10"
            >
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">View the public league</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">See rosters, history, and standings</p>
              </div>
              <FiExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </Link>
          )}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1">Contact</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FiMail className="h-3.5 w-3.5 text-zinc-400" />{listing.contact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingCard({ listing, onClick }: { listing: Listing; onClick: () => void }) {
  const isOpenSpot = listing.type === "open-spot";
  return (
    <li onClick={onClick}
      className="group rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/30 px-6 py-5 hover:border-zinc-300 dark:hover:border-zinc-700/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition cursor-pointer shadow-sm dark:shadow-none">
      <div className="flex items-start gap-4">
        <Avatar name={listingPosterName(listing)} src={listing.creator.profileImage || null} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${isOpenSpot ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"}`}>
              {isOpenSpot ? "Open Spot" : "Want Out"}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${FORMAT_STYLE[listing.format]}`}>{listing.format}</span>
            <span className="rounded-full border border-zinc-200 dark:border-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">{listing.platform}</span>
            {(listing.sleeperLeagueId || listing.espnLeagueId) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <FiExternalLink className="h-2.5 w-2.5" /> Public league
              </span>
            )}
            <span className="ml-auto text-[10px] text-zinc-500">{timeAgo(listing.createdAt)}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white">{listing.leagueName}</p>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{listing.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><FiUsers className="h-3 w-3" />{listing.teamCount} teams</span>
            <span className="inline-flex items-center gap-1"><FiTag className="h-3 w-3" />{listing.scoring}</span>
            {listing.entryFee !== null && <span className="inline-flex items-center gap-1"><FiDollarSign className="h-3 w-3" />${listing.entryFee} entry</span>}
            {isOpenSpot && listing.spotsAvailable != null && (
              <span className="ml-auto inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {listing.spotsAvailable} spot{listing.spotsAvailable > 1 ? "s" : ""} open
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeagueMarketPage() {
  const [activeTab, setActiveTab]       = useState<"all" | "open-spot" | "want-out">("all");
  const [formatFilter, setFormatFilter] = useState<LeagueFormat | "All">("All");
  const [showCreate, setShowCreate]     = useState(false);
  const [showCreateQueue, setShowCreateQueue] = useState(false);
  const [viewListing, setViewListing]   = useState<Listing | null>(null);

  const [queuePosts, setQueuePosts]     = useState<QueuePost[]>([]);
  const [queueLoaded, setQueueLoaded]   = useState(false);
  const [joiningId, setJoiningId]       = useState<string | null>(null);
  const [listings, setListings]         = useState<Listing[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/league-market/new-leagues")
      .then((r) => r.json())
      .then((d) => setQueuePosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setQueueLoaded(true));

    fetch("/api/league-market/listings")
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setListingsLoaded(true));
  }, []);

  function handleListingCreated(listing: Listing) {
    setListings((prev) => [listing, ...prev]);
  }

  async function handleJoin(postId: string) {
    setJoiningId(postId);
    try {
      const res = await fetch(`/api/league-market/new-leagues/${postId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Failed to join"); return; }
      setQueuePosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, hasJoined: data.hasJoined, memberCount: data.memberCount, spotsLeft: data.spotsLeft, status: data.status, members: data.members }
            : p
        )
      );
    } finally {
      setJoiningId(null);
    }
  }

  function handleQueueCreated(post: QueuePost) {
    setQueuePosts((prev) => [post, ...prev]);
  }

  const filteredListings = listings.filter((l) => {
    if (activeTab !== "all" && l.type !== activeTab) return false;
    if (formatFilter !== "All" && l.format !== formatFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-12">

        {/* Page header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800/70 bg-zinc-100/80 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-[#F4D06F] shadow-[0_0_8px_rgba(244,208,111,0.6)]" />
            Community
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">League Market</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Find an open spot, form a new league, or hand off your team.</p>
            </div>
          </div>
        </div>

        {/* ── New Leagues Section ─────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <FiZap className="h-4 w-4 text-amber-500 dark:text-[#F4D06F]" />
                New Leagues
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Commissioners recruiting managers — join the queue to claim your spot.</p>
            </div>
            <button
              onClick={() => setShowCreateQueue(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 dark:border-[#F4D06F]/30 bg-amber-500/5 dark:bg-[#F4D06F]/5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-[#F4D06F] hover:bg-amber-500/10 dark:hover:bg-[#F4D06F]/10 transition"
            >
              <FiPlus className="h-3.5 w-3.5" />
              Start New League
            </button>
          </div>

          {!queueLoaded ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-zinc-200 dark:bg-zinc-800/40" />
              ))}
            </div>
          ) : queuePosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/20 flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60">
                <FiZap className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No leagues forming yet</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600 max-w-xs">
                Be the first to start one and recruit managers from the community.
              </p>
              <button onClick={() => setShowCreateQueue(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition">
                <FiPlus className="h-3.5 w-3.5" /> Start a League
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {queuePosts.map((post) => (
                <QueueCard
                  key={post.id}
                  post={post}
                  onJoin={handleJoin}
                  joining={joiningId === post.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Open Spots & Transfers ──────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FiUsers className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            Open Spots &amp; Transfers
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/40 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <FiPlus className="h-3.5 w-3.5" />
            Post Listing
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/40 p-1">
            {(["all", "open-spot", "want-out"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                {tab === "all" ? "All" : tab === "open-spot" ? "Open Spots" : "Want Out"}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as LeagueFormat | "All")}
              className="h-8 appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 pl-3 pr-7 text-xs text-zinc-600 dark:text-zinc-400 focus:outline-none focus:border-amber-500/50 dark:focus:border-[#F4D06F]/40 transition cursor-pointer">
              <option value="All">All formats</option>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
          </div>
        </div>

        {!listingsLoaded ? (
          <ul className="space-y-4">
            {[1, 2].map((i) => (
              <li key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800/40" />
            ))}
          </ul>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100 dark:bg-zinc-900/60">
              <FiUsers className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No listings yet</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-600 max-w-xs">Post an open spot or let people know you need a replacement.</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 dark:bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-[#f0c84a] transition">
              <FiPlus className="h-3.5 w-3.5" /> Post a Listing
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onClick={() => setViewListing(listing)} />
            ))}
          </ul>
        )}
      </div>

      {showCreateQueue && <CreateNewLeagueModal onClose={() => setShowCreateQueue(false)} onCreated={handleQueueCreated} />}
      {showCreate      && <CreateListingModal   onClose={() => setShowCreate(false)} onCreated={handleListingCreated} />}
      {viewListing     && <ListingDetailModal   listing={viewListing} onClose={() => setViewListing(null)} />}
    </div>
  );
}
