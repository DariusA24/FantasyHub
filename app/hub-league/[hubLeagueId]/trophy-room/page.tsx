"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LeagueNav } from "../LeagueNav";
import { getTrophyDesign } from "./designs";
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiArrowLeft, FiCamera, FiRefreshCw } from "react-icons/fi";

const TrophyScene = dynamic(() => import("./TrophyScene").then((m) => m.TrophyScene), { ssr: false });

export type TrophyVariant = "classic" | "diamond" | "obsidian" | "ruby" | "emerald";

type Champion = {
  id: string;
  season: string;
  winnerName: string;
  teamName: string | null;
  wins: number;
  losses: number;
  ties: number;
  notes: string | null;
  variant: TrophyVariant;
  photoUrl: string | null;
};

const VARIANT_LABELS: Record<TrophyVariant, { label: string; color: string }> = {
  classic:  { label: "Gold Classic",    color: "#F4D06F" },
  diamond:  { label: "Silver Diamond",  color: "#d0e8f8" },
  obsidian: { label: "Obsidian Dark",   color: "#8888aa" },
  ruby:     { label: "Ruby Fire",       color: "#e04060" },
  emerald:  { label: "Emerald",         color: "#14c070" },
};

const CURRENT_YEAR = new Date().getFullYear();

// shared input class for modal — works in light + dark
const modalInput =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-amber-400/60 dark:focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 dark:focus:ring-[#F4D06F]/20";

// ─── Add Champion Modal ───────────────────────────────────────────────────────
function AddChampionModal({
  hubLeagueId,
  onClose,
  onCreated,
}: {
  hubLeagueId: string;
  onClose: () => void;
  onCreated: (c: Champion) => void;
}) {
  const [season, setSeason]         = useState(String(CURRENT_YEAR - 1));
  const [winnerName, setWinnerName] = useState("");
  const [teamName, setTeamName]     = useState("");
  const [wins, setWins]             = useState("");
  const [losses, setLosses]         = useState("");
  const [ties, setTies]             = useState("0");
  const [notes, setNotes]           = useState("");
  const [variant, setVariant]       = useState<TrophyVariant>("classic");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/champions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season, winnerName, teamName: teamName || null,
          wins: Number(wins), losses: Number(losses), ties: Number(ties || 0),
          notes: notes || null, variant,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      const data = await res.json();
      onCreated(data.champion);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = winnerName.trim() && wins !== "" && losses !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Champion</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Season Year</label>
              <input type="number" value={season} onChange={(e) => setSeason(e.target.value)} min="2000" max={CURRENT_YEAR}
                className={modalInput} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Team Name <span className="normal-case text-zinc-400 dark:text-zinc-600">(optional)</span>
              </label>
              <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. The Machines"
                className={modalInput} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Champion Name</label>
            <input type="text" value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="e.g. Darius Argueta"
              className={modalInput} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([["Wins", wins, setWins], ["Losses", losses, setLosses], ["Ties", ties, setTies]] as const).map(([label, val, setter]) => (
              <div key={label}>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</label>
                <input type="number" value={val} onChange={(e) => (setter as (v: string) => void)(e.target.value)} placeholder="0" min="0"
                  className={modalInput} />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              Notes <span className="normal-case text-zinc-400 dark:text-zinc-600">(optional)</span>
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Back-to-back champion, undefeated playoffs"
              className={modalInput} />
          </div>
          {/* Trophy variant picker */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Trophy Style</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(VARIANT_LABELS) as [TrophyVariant, { label: string; color: string }][]).map(([key, { label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVariant(key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    variant === key
                      ? "border-current bg-current/10"
                      : "border-zinc-300 dark:border-zinc-700/60 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                  style={{ color: variant === key ? color : undefined }}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4D06F] px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-[#f0c84a] transition disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "Saving…" : "Add to Trophy Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TrophyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const hubLeagueId = String(params?.hubLeagueId ?? "");

  const [champions, setChampions] = useState<Champion[]>([]);
  const [isOwner, setIsOwner]     = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [activeIndex, setActiveIndex]   = useState(0);
  const [slideDir, setSlideDir]         = useState<"left" | "right" | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncMsgTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchChampions(): Promise<Champion[]> {
    const r = await fetch(`/api/hub-leagues/${hubLeagueId}/champions`);
    const d = await r.json();
    setIsOwner(d.isOwner ?? false);
    setChampions(d.champions ?? []);
    return d.champions ?? [];
  }

  useEffect(() => {
    if (!hubLeagueId) return;
    // Load champions; if owner has none, auto-sync from Sleeper before showing the page
    fetch(`/api/hub-leagues/${hubLeagueId}/champions`)
      .then((r) => r.json())
      .then(async (data) => {
        const champs: Champion[] = data.champions ?? [];
        const owner: boolean = data.isOwner ?? false;
        setIsOwner(owner);

        if (champs.length > 0 || !owner) {
          setChampions(champs);
          setLoaded(true);
          return;
        }

        // Owner + empty → silently auto-sync (skeleton stays up)
        setSyncing(true);
        try {
          const res = await fetch(`/api/hub-leagues/${hubLeagueId}/champions/sync`, { method: "POST" });
          const syncData = await res.json();
          if ((syncData.synced ?? 0) > 0) {
            const refetch = await fetch(`/api/hub-leagues/${hubLeagueId}/champions`);
            const refetchData = await refetch.json();
            setChampions(refetchData.champions ?? []);
          }
        } catch { /* silent */ } finally {
          setSyncing(false);
          setLoaded(true);
        }
      })
      .catch(() => {
        setChampions([]);
        setLoaded(true);
      });
  }, [hubLeagueId]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/champions/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(`Error: ${data.error ?? "Unknown"}`);
        return;
      }
      const msg = data.synced === 0
        ? "No completed seasons found"
        : `Synced ${data.synced} season${data.synced === 1 ? "" : "s"}`;
      setSyncMsg(msg);
      if (data.synced > 0) await fetchChampions();
    } catch {
      setSyncMsg("Sync failed — try again");
    } finally {
      setSyncing(false);
      if (syncMsgTimer.current) clearTimeout(syncMsgTimer.current);
      syncMsgTimer.current = setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  function handleCreated(champion: Champion) {
    setChampions((prev) => {
      const filtered = prev.filter((c) => c.season !== champion.season);
      return [champion, ...filtered].sort((a, b) => Number(b.season) - Number(a.season));
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !featured) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("championId", featured.id);
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}/champions/upload-photo`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setChampions((prev) =>
          prev.map((c) => c.id === featured.id ? { ...c, photoUrl: data.photoUrl } : c)
        );
      }
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function navigate(dir: "left" | "right") {
    const nextIndex = dir === "left" ? activeIndex - 1 : activeIndex + 1;
    if (nextIndex < 0 || nextIndex >= champions.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setSlideDir(dir);
    timerRef.current = setTimeout(() => {
      setActiveIndex(nextIndex);
      setSlideDir(dir === "left" ? "right" : "left");
      timerRef.current = setTimeout(() => setSlideDir(null), 50);
    }, 280);
  }

  const featured = champions[activeIndex] ?? null;
  const canPrev  = activeIndex > 0;
  const canNext  = activeIndex < champions.length - 1;

  const slideStyle: React.CSSProperties = (() => {
    if (!slideDir) return { opacity: 1, transform: "translateX(0)", transition: "opacity 0.28s ease, transform 0.28s ease" };
    const exiting = slideDir === "left"
      ? { opacity: 0, transform: "translateX(-8%)" }
      : { opacity: 0, transform: "translateX(8%)" };
    return { ...exiting, transition: "opacity 0.28s ease, transform 0.28s ease" };
  })();

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 dark:[background:radial-gradient(ellipse_at_50%_0%,#0f0d18_0%,#06050d_60%,#020208_100%)]">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-zinc-800 dark:text-zinc-200">
        <LeagueNav />

        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition text-sm"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-800" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-600/70 dark:text-[#F4D06F]/40 mb-0.5">Hall of Fame</p>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Trophy Room</h1>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              {/* Sync message */}
              {syncMsg && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{syncMsg}</span>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/40 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncing
                  ? <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-400/30 border-t-zinc-500 dark:border-t-zinc-300 animate-spin" />
                  : <FiRefreshCw className="h-3.5 w-3.5" />
                }
                {syncing ? "Syncing…" : "Sync from Sleeper"}
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-4 py-2 text-sm font-medium text-amber-700 dark:text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
              >
                <FiPlus className="h-4 w-4" />
                Add Champion
              </button>
            </div>
          )}
        </div>

        {/* ── Showcase stage ── */}
        {!loaded ? (
          <div className="mt-16 flex justify-center animate-pulse">
            <div className="flex flex-col items-center gap-0">
              <div className="w-36 h-52 rounded-xl bg-zinc-200 dark:bg-zinc-800/40 mb-0" />
              <div className="w-52 h-36 rounded-sm bg-zinc-200/70 dark:bg-zinc-800/30" />
            </div>
          </div>
        ) : !featured ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 text-6xl opacity-10">🏆</div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No champions yet</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600 max-w-[240px]">
              {isOwner
                ? 'Click "Sync from Sleeper" to auto-fill winners from your league history, or add them manually.'
                : "No champions have been crowned yet."}
            </p>
            {isOwner && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/40 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition disabled:opacity-40"
                >
                  {syncing ? <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-400/30 border-t-zinc-500 animate-spin" /> : <FiRefreshCw className="h-3.5 w-3.5" />}
                  {syncing ? "Syncing…" : "Sync from Sleeper"}
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-4 py-2 text-sm font-medium text-amber-700 dark:text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 3D Stage — always dark (it's the showcase) */}
            <div
              className="relative rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-800/40"
              style={{ background: "#06050d" }}
            >
              <div style={slideStyle}>
                <TrophyScene champion={featured} />
              </div>

              {/* Champion info overlay — bottom center */}
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-6 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(6,5,13,0.92) 0%, rgba(6,5,13,0.4) 60%, transparent 100%)", paddingTop: 80 }}
              >
                {/* Trophy design + variant badge */}
                <span
                  className="mb-2 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold"
                  style={{ borderColor: `${VARIANT_LABELS[featured.variant]?.color}40`, color: VARIANT_LABELS[featured.variant]?.color }}
                >
                  {getTrophyDesign(featured.season).label} · {VARIANT_LABELS[featured.variant]?.label}
                </span>

                {/* Photo + text row */}
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="relative shrink-0">
                    {featured.photoUrl ? (
                      <img
                        src={featured.photoUrl}
                        alt={featured.winnerName}
                        className="h-14 w-14 rounded-full object-cover border-2"
                        style={{ borderColor: VARIANT_LABELS[featured.variant]?.color }}
                      />
                    ) : isOwner ? (
                      <div className="h-14 w-14 rounded-full border-2 border-dashed border-zinc-700/60 bg-zinc-900/60 flex items-center justify-center">
                        <FiCamera className="h-5 w-5 text-zinc-600" />
                      </div>
                    ) : null}

                    {isOwner && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-wait"
                        title="Change photo"
                      >
                        {uploadingPhoto
                          ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          : <FiCamera className="h-4 w-4 text-white" />
                        }
                      </button>
                    )}
                  </div>

                  {isOwner && (
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  )}

                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#F4D06F]/50 mb-0.5">{featured.season} Champion</p>
                    <p className="text-2xl font-black text-white leading-tight">{featured.winnerName}</p>
                    {featured.teamName && (
                      <p className="text-sm text-zinc-400 italic mt-0.5">{featured.teamName}</p>
                    )}
                    <p className="mt-1 text-sm font-semibold" style={{ color: VARIANT_LABELS[featured.variant]?.color }}>
                      {featured.wins}–{featured.losses}{featured.ties > 0 ? `–${featured.ties}` : ""}
                    </p>
                    {featured.notes && (
                      <p className="mt-0.5 text-xs text-zinc-600 italic">{featured.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Left arrow */}
              <button
                onClick={() => navigate("left")}
                disabled={!canPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/60 bg-black/50 text-zinc-300 backdrop-blur-sm transition hover:border-[#F4D06F]/40 hover:text-[#F4D06F] disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>

              {/* Right arrow */}
              <button
                onClick={() => navigate("right")}
                disabled={!canNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/60 bg-black/50 text-zinc-300 backdrop-blur-sm transition hover:border-[#F4D06F]/40 hover:text-[#F4D06F] disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <FiChevronRight className="h-5 w-5" />
              </button>

              {/* Dot indicators */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {champions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(i < activeIndex ? "left" : "right")}
                    className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-[#F4D06F]" : "w-1.5 bg-zinc-600 hover:bg-zinc-400"}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddChampionModal
          hubLeagueId={hubLeagueId}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
