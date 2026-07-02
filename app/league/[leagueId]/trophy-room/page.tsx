"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LeagueNav } from "../LeagueNav";
import { FiChevronLeft, FiChevronRight, FiArrowLeft } from "react-icons/fi";

const TrophyScene = dynamic(
  () => import("@/app/hub-league/[hubLeagueId]/trophy-room/TrophyScene").then(m => m.TrophyScene),
  { ssr: false }
);

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
  classic:  { label: "Gold Classic",   color: "#F4D06F" },
  diamond:  { label: "Silver Diamond", color: "#d0e8f8" },
  obsidian: { label: "Obsidian Dark",  color: "#8888aa" },
  ruby:     { label: "Ruby Fire",      color: "#e04060" },
  emerald:  { label: "Emerald",        color: "#14c070" },
};

export default function PublicTrophyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = String(params?.leagueId ?? "");

  const [champions, setChampions] = useState<Champion[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    // Fetch champions from hub-league API if this league is registered as a hub league
    const fetchChampions = async () => {
      try {
        // Look up the hub league that owns this Sleeper league
        const res = await fetch(`/api/hub-leagues?sleeperLeagueId=${leagueId}`);
        if (res.ok) {
          const data = await res.json();
          const hubLeagueId = data?.hubLeagueSeasons?.[0]?.hubLeagueId ?? null;
          if (hubLeagueId) {
            const champRes = await fetch(`/api/hub-leagues/${hubLeagueId}/champions`);
            if (champRes.ok) {
              const champData = await champRes.json();
              setChampions(Array.isArray(champData.champions) ? champData.champions : []);
            }
          }
        }
      } catch {
        // silently fail — empty state shown below
      } finally {
        setLoaded(true);
      }
    };
    fetchChampions();
  }, [leagueId]);

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
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f0d18 0%, #06050d 60%, #020208 100%)" }}>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 text-zinc-200">
        <LeagueNav />

        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
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
              No champions have been crowned yet.
            </p>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800/40" style={{ background: "#06050d" }}>
            <div style={slideStyle}>
              <TrophyScene champion={featured} />
            </div>

            {/* Champion info overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-6 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(6,5,13,0.92) 0%, rgba(6,5,13,0.4) 60%, transparent 100%)", paddingTop: 80 }}
            >
              <span className="mb-2 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold"
                style={{ borderColor: `${VARIANT_LABELS[featured.variant]?.color}40`, color: VARIANT_LABELS[featured.variant]?.color }}
              >
                {VARIANT_LABELS[featured.variant]?.label}
              </span>

              <div className="flex items-center gap-4">
                {featured.photoUrl && (
                  <img src={featured.photoUrl} alt={featured.winnerName}
                    className="h-14 w-14 rounded-full object-cover border-2 shrink-0"
                    style={{ borderColor: VARIANT_LABELS[featured.variant]?.color }} />
                )}
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#F4D06F]/50 mb-0.5">{featured.season} Champion</p>
                  <p className="text-2xl font-black text-white leading-tight">{featured.winnerName}</p>
                  {featured.teamName && <p className="text-sm text-zinc-400 italic mt-0.5">{featured.teamName}</p>}
                  <p className="mt-1 text-sm font-semibold" style={{ color: VARIANT_LABELS[featured.variant]?.color }}>
                    {featured.wins}–{featured.losses}{featured.ties > 0 ? `–${featured.ties}` : ""}
                  </p>
                  {featured.notes && <p className="mt-0.5 text-xs text-zinc-600 italic">{featured.notes}</p>}
                </div>
              </div>
            </div>

            {/* Nav arrows */}
            <button onClick={() => navigate("left")} disabled={!canPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/60 bg-black/50 text-zinc-300 backdrop-blur-sm transition hover:border-[#F4D06F]/40 hover:text-[#F4D06F] disabled:opacity-20 disabled:cursor-not-allowed">
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("right")} disabled={!canNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/60 bg-black/50 text-zinc-300 backdrop-blur-sm transition hover:border-[#F4D06F]/40 hover:text-[#F4D06F] disabled:opacity-20 disabled:cursor-not-allowed">
              <FiChevronRight className="h-5 w-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {champions.map((_, i) => (
                <button key={i} onClick={() => navigate(i < activeIndex ? "left" : "right")}
                  className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-[#F4D06F]" : "w-1.5 bg-zinc-600 hover:bg-zinc-400"}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
