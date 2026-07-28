"use client";

import { useState } from "react";
import { FiZap, FiShield, FiEdit2, FiTrendingUp, FiTrendingDown, FiMinus, FiAward } from "react-icons/fi";
import { GiTrophy, GiFireBowl, GiLaurelCrown } from "react-icons/gi";

type Trophy = { type: string; label: string; description: string; value: string | null };
type Rival = { oppOwnerId: string; oppName: string; wins: number; losses: number; ties: number; played: number };
type FSeason = { season: string; teamName: string; wins: number; losses: number; ties: number; pf: number; rank: number; seed: number | null; champion: boolean };
type Franchise = {
  ownerId: string; name: string; managerName: string; seasonsPlayed: number;
  wins: number; losses: number; ties: number; pf: number; pa: number; championships: number;
  bio: string; trophies: Trophy[]; rivals: Rival[]; seasons: FSeason[];
};

const TROPHY_ICON: Record<string, React.ReactNode> = {
  champion: <GiLaurelCrown className="h-6 w-6" />,
  first:    <GiTrophy className="h-6 w-6" />,
  points:   <FiZap className="h-6 w-6" />,
  week:     <GiFireBowl className="h-6 w-6" />,
  playoff:  <FiShield className="h-6 w-6" />,
};
const TROPHY_STYLE: Record<string, string> = {
  champion: "border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-[#F4D06F]",
  first:    "border-amber-400/40 bg-amber-500/5 text-amber-600 dark:text-[#F4D06F]",
  points:   "border-emerald-400/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  week:     "border-orange-400/40 bg-orange-500/5 text-orange-600 dark:text-orange-400",
  playoff:  "border-blue-400/40 bg-blue-500/5 text-blue-600 dark:text-blue-400",
};
const trendStyle: Record<string, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-500 dark:text-red-400",
  flat: "text-zinc-500 dark:text-zinc-400",
};

const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

export default function EspnFranchiseView({
  franchises, leagueId, canEdit, myOwnerId,
}: {
  franchises: Franchise[];
  leagueId: string;
  canEdit: boolean;
  myOwnerId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(myOwnerId ?? franchises[0]?.ownerId ?? null);
  const [bios, setBios] = useState<Record<string, string>>(() => Object.fromEntries(franchises.map(f => [f.ownerId, f.bio])));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const f = franchises.find(x => x.ownerId === selectedId) ?? franchises[0];
  if (!f) return <p className="text-sm text-zinc-500 dark:text-zinc-400">No franchise history found.</p>;

  const bio = bios[f.ownerId] ?? "";
  const rival = f.rivals.find(r => r.oppOwnerId === selectedOppId) ?? f.rivals[0];
  // You can only edit your own franchise's bio
  const canEditOwn = canEdit && !!myOwnerId && f.ownerId === myOwnerId;

  async function saveBio() {
    setSaving(true);
    try {
      const res = await fetch(`/api/espn/league/${leagueId}/team-bio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: f.ownerId, bio: draft.trim() }),
      });
      if (res.ok) { setBios(prev => ({ ...prev, [f.ownerId]: draft.trim() })); setEditing(false); }
    } finally { setSaving(false); }
  }

  function selectFranchise(id: string) { setSelectedId(id); setSelectedOppId(null); setEditing(false); }

  const games = f.wins + f.losses + f.ties;
  const winPct = games > 0 ? ((f.wins + f.ties * 0.5) / games) * 100 : 0;
  const stats = [
    { label: "All-Time Record", value: `${f.wins}–${f.losses}${f.ties > 0 ? `–${f.ties}` : ""}` },
    { label: "Win %", value: `${winPct.toFixed(1)}%` },
    { label: "Championships", value: `${f.championships}` },
    { label: "Seasons", value: `${f.seasonsPlayed}` },
    { label: "Total Points", value: f.pf.toFixed(0) },
    { label: "Points Against", value: f.pa.toFixed(0) },
  ];
  const rivalTrend = rival ? (rival.wins > rival.losses ? "up" : rival.wins < rival.losses ? "down" : "flat") : "flat";

  return (
    <>
      {/* ─── Franchise picker ─── */}
      {franchises.length > 1 && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">League Franchises</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {franchises.map(fr => {
              const isSelected = fr.ownerId === f.ownerId;
              return (
                <button
                  key={fr.ownerId}
                  onClick={() => selectFranchise(fr.ownerId)}
                  className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? "border-red-500/50 bg-red-500/10"
                      : "border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-black text-red-600 dark:text-red-400">
                    {initials(fr.name)}
                    {fr.championships > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-400 px-1 text-[8px] font-black text-zinc-900">{fr.championships}★</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate max-w-[120px] text-xs font-semibold ${isSelected ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-200"}`}>
                      {fr.name}
                      {fr.ownerId === myOwnerId && <span className="ml-1 text-[9px] text-red-500 dark:text-red-400">(you)</span>}
                    </p>
                    <p className="text-[10px] text-zinc-500">{fr.wins}–{fr.losses} all-time</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Profile card (bio) ─── */}
      <div className="mb-6 flex flex-col items-center hub-card px-5 py-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 ring-4 ring-zinc-200 dark:ring-zinc-700 text-3xl font-black text-red-600 dark:text-red-400">
          {initials(f.name)}
        </div>
        <p className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">{f.name}</p>
        <p className="text-xs text-zinc-500">{f.managerName} · {f.wins}–{f.losses} all-time</p>
        {f.championships > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1">
            <GiLaurelCrown className="h-3.5 w-3.5 text-amber-600 dark:text-[#F4D06F]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-[#F4D06F]">{f.championships}× Champion</span>
          </div>
        )}

        {editing ? (
          <div className="mt-4 w-full max-w-sm">
            <textarea
              value={draft} onChange={e => setDraft(e.target.value)} rows={3} maxLength={280}
              placeholder="Write this franchise's story…"
              className="w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={saveBio} disabled={saving} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40 transition">{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition">Cancel</button>
            </div>
          </div>
        ) : bio ? (
          <div className="mt-2 flex max-w-sm items-start gap-1.5">
            <p className="text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{bio}</p>
            {canEditOwn && <button onClick={() => { setDraft(bio); setEditing(true); }} className="mt-0.5 shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"><FiEdit2 className="h-3 w-3" /></button>}
          </div>
        ) : canEditOwn ? (
          <button onClick={() => { setDraft(""); setEditing(true); }} className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition">+ Add a bio</button>
        ) : null}
      </div>

      {/* ─── Trophy case ─── */}
      <section className="mb-6 hub-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Trophy Case</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">All-time honors across every season</p>
          </div>
          {f.trophies.length > 0 && (
            <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
              {f.trophies.length}
            </span>
          )}
        </div>
        {f.trophies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GiTrophy className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">No trophies yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {f.trophies.map((tr, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl border p-3.5 ${TROPHY_STYLE[tr.type] ?? "border-zinc-200 dark:border-zinc-700/40"}`}>
                <div className="shrink-0 mt-0.5">{TROPHY_ICON[tr.type] ?? <FiAward className="h-6 w-6" />}</div>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="text-sm font-semibold">{tr.label}</p>
                    {tr.value && <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-medium dark:bg-black/20">{tr.value}</span>}
                  </div>
                  <p className="text-[11px] opacity-70 leading-snug">{tr.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Career stat cards ─── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(s => (
          <div key={s.label} className="hub-card p-4">
            <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{s.value}</p>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Rivalries (all-time H2H) ─── */}
      <section className="mb-6 hub-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rivalries</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">All-time head-to-head vs. each franchise</p>
        </div>
        {!rival ? (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 py-4 text-center">No head-to-head history yet.</p>
        ) : (
          <div className="space-y-4">
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              value={rival.oppOwnerId}
              onChange={e => setSelectedOppId(e.target.value)}
            >
              {f.rivals.map(r => (
                <option key={r.oppOwnerId} value={r.oppOwnerId}>{r.oppName} — {r.wins}-{r.losses}{r.ties > 0 ? `-${r.ties}` : ""}</option>
              ))}
            </select>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:border-zinc-700/60 dark:from-zinc-900 dark:to-zinc-800/80">
              <div className="relative z-10 flex items-center justify-between gap-2 px-6 py-6">
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-base font-black text-red-600 dark:text-red-400 ring-2 ring-zinc-300 dark:ring-zinc-600">{initials(f.name)}</div>
                  <p className="max-w-[90px] text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2">{f.name}</p>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">All-time</p>
                  <div className={`flex items-baseline gap-1.5 ${trendStyle[rivalTrend]}`}>
                    <span className="text-4xl font-black tabular-nums leading-none">{rival.wins}</span>
                    <span className="text-xl font-black text-zinc-400 dark:text-zinc-500">-</span>
                    <span className="text-4xl font-black tabular-nums leading-none">{rival.losses}</span>
                    {rival.ties > 0 && (<><span className="text-xl font-black text-zinc-400 dark:text-zinc-500">-</span><span className="text-4xl font-black tabular-nums leading-none">{rival.ties}</span></>)}
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-semibold ${trendStyle[rivalTrend]}`}>
                    {rivalTrend === "up" ? <FiTrendingUp className="h-3 w-3" /> : rivalTrend === "down" ? <FiTrendingDown className="h-3 w-3" /> : <FiMinus className="h-3 w-3" />}
                    <span>{rivalTrend === "up" ? "Winning series" : rivalTrend === "down" ? "Losing series" : "Even series"}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">{rival.played} game{rival.played !== 1 ? "s" : ""} played</p>
                </div>
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-base font-black text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 ring-2 ring-zinc-300 dark:ring-zinc-600">{initials(rival.oppName)}</div>
                  <p className="max-w-[90px] text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2">{rival.oppName}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── Season by season ─── */}
      <section className="hub-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Season by Season</h3>
        </div>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
          {f.seasons.map(s => (
            <li key={s.season} className="flex items-center gap-3 px-5 py-3">
              <span className="w-12 shrink-0 text-xs font-bold text-zinc-600 dark:text-zinc-400">{s.season}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                  {s.teamName}
                  {s.champion && <GiLaurelCrown className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-500 dark:text-[#F4D06F]" />}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Finished #{s.rank}{s.seed ? " · playoffs" : ""} · {s.pf.toFixed(0)} PF
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                {s.wins}–{s.losses}{s.ties > 0 ? `–${s.ties}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
