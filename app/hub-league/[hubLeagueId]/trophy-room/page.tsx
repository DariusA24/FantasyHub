"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LeagueNav } from "../LeagueNav";
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiArrowLeft, FiCamera } from "react-icons/fi";

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
      <div className="w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100">Add Champion</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Season Year</label>
              <input type="number" value={season} onChange={(e) => setSeason(e.target.value)} min="2000" max={CURRENT_YEAR}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Team Name <span className="normal-case text-zinc-600">(optional)</span></label>
              <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. The Machines"
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Champion Name</label>
            <input type="text" value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="e.g. Darius Argueta"
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["Wins", wins, setWins], ["Losses", losses, setLosses], ["Ties", ties, setTies]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label as string}</label>
                <input type="number" value={val as string} onChange={(e) => (setter as any)(e.target.value)} placeholder="0" min="0"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Notes <span className="normal-case text-zinc-600">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Back-to-back champion, undefeated playoffs"
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#F4D06F]/40 focus:outline-none focus:ring-1 focus:ring-[#F4D06F]/20" />
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
                      : "border-zinc-700/60 text-zinc-500 hover:border-zinc-600"
                  }`}
                  style={{ color: variant === key ? color : undefined }}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition">Cancel</button>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir]         = useState<"left" | "right" | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // TODO: replace with real API once auth is wired
    setChampions([
      {
        id: "1",
        season: "2024",
        winnerName: "Darius Argueta",
        teamName: "The Machines",
        wins: 11,
        losses: 2,
        ties: 0,
        notes: "Undefeated in playoffs",
        variant: "classic",
        photoUrl: null,
      },
      {
        id: "2",
        season: "2023",
        winnerName: "Marcus Johnson",
        teamName: "Air Raid",
        wins: 10,
        losses: 3,
        ties: 0,
        notes: "Highest scoring team in league history",
        variant: "diamond",
        photoUrl: null,
      },
      {
        id: "3",
        season: "2022",
        winnerName: "Chris Williams",
        teamName: "Dynasty Kings",
        wins: 9,
        losses: 4,
        ties: 0,
        notes: null,
        variant: "ruby",
        photoUrl: null,
      },
    ]);
    setIsOwner(true);
    setLoaded(true);
  }, [hubLeagueId]);

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

    // Slide out
    setSlideDir(dir);

    // After exit animation, swap and slide in from opposite side
    timerRef.current = setTimeout(() => {
      setActiveIndex(nextIndex);
      setSlideDir(dir === "left" ? "right" : "left");
      timerRef.current = setTimeout(() => setSlideDir(null), 50);
    }, 280);
  }

  const featured = champions[activeIndex] ?? null;
  const canPrev  = activeIndex > 0;
  const canNext  = activeIndex < champions.length - 1;

  // Compute transition style
  const slideStyle: React.CSSProperties = (() => {
    if (!slideDir) return { opacity: 1, transform: "translateX(0)", transition: "opacity 0.28s ease, transform 0.28s ease" };
    const exiting = slideDir === "left"
      ? { opacity: 0, transform: "translateX(-8%)" }
      : { opacity: 0, transform: "translateX(8%)" };
    return { ...exiting, transition: "opacity 0.28s ease, transform 0.28s ease" };
  })();

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0f0d18 0%, #06050d 60%, #020208 100%)" }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 text-zinc-200">
        <LeagueNav />

        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition text-sm"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="w-px h-5 bg-zinc-800" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#F4D06F]/40 mb-0.5">Hall of Fame</p>
              <h1 className="text-3xl font-black text-zinc-100">Trophy Room</h1>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-4 py-2 text-sm font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
            >
              <FiPlus className="h-4 w-4" />
              Add Champion
            </button>
          )}
        </div>

        {/* ── Showcase stage ── */}
        {!loaded ? (
          <div className="mt-16 flex justify-center animate-pulse">
            <div className="flex flex-col items-center gap-0">
              <div className="w-36 h-52 rounded-xl bg-zinc-800/40 mb-0" />
              <div className="w-52 h-36 rounded-sm bg-zinc-800/30" />
            </div>
          </div>
        ) : !featured ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 text-6xl opacity-10">🏆</div>
            <p className="text-sm font-medium text-zinc-400">No champions yet</p>
            <p className="mt-1 text-xs text-zinc-600 max-w-[200px]">
              {isOwner ? "Add the first champion to start building your legacy." : "No champions have been crowned yet."}
            </p>
            {isOwner && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#F4D06F]/30 bg-[#F4D06F]/5 px-4 py-2 text-sm font-medium text-[#F4D06F] hover:bg-[#F4D06F]/10 transition"
              >
                <FiPlus className="h-4 w-4" />
                Add First Champion
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 3D Stage with overlays */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800/40" style={{ background: "#06050d" }}>
              <div style={slideStyle}>
                <TrophyScene champion={featured} />
              </div>

              {/* Champion info overlay — bottom center */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-6 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(6,5,13,0.92) 0%, rgba(6,5,13,0.4) 60%, transparent 100%)", paddingTop: 80 }}
              >
                {/* Trophy variant badge */}
                <span className="mb-2 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold"
                  style={{ borderColor: `${VARIANT_LABELS[featured.variant]?.color}40`, color: VARIANT_LABELS[featured.variant]?.color }}
                >
                  {VARIANT_LABELS[featured.variant]?.label}
                </span>

                {/* Photo + text row */}
                <div className="flex items-center gap-4">
                  {/* Photo — commissioner can click to change, others just see it */}
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

                    {/* Commissioner overlay button */}
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

                  {/* Hidden file input */}
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
