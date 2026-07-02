'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiTrash2, FiLock, FiUnlock, FiChevronDown, FiChevronUp,
  FiCheck, FiAlertCircle, FiExternalLink, FiRefreshCw, FiWifi,
} from 'react-icons/fi';

type EspnLeague = { id: string; leagueId: string; season: string; name: string | null; teamCount: number | null };
type VerifyResult = { displayName: string | null; swidPreview: string; leagueCount: number; leagues: { leagueId: string; season: string; name: string | null }[] };

export default function EspnPanel({
  initial,
  hasCredentials,
}: {
  initial: EspnLeague[];
  hasCredentials: boolean;
}) {
  // ── Leagues state ──────────────────────────────────────────────────────────
  const [leagues, setLeagues]       = useState<EspnLeague[]>(initial);
  const [leagueId, setLeagueId]     = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [season, setSeason]         = useState('2025');
  const [adding, setAdding]         = useState(false);
  const [leagueError, setLeagueError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // ── Credentials state ──────────────────────────────────────────────────────
  const [credsConnected, setCredsConnected] = useState(hasCredentials);
  const [showCredForm, setShowCredForm]     = useState(false);
  const [swid, setSwid]       = useState('');
  const [espnS2, setEspnS2]   = useState('');
  const [savingCreds, setSavingCreds]   = useState(false);
  const [credError, setCredError]       = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState<string | null>(null);
  const [verifying, setVerifying]       = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const add = async () => {
    if (!leagueId.trim()) return;
    setAdding(true);
    setLeagueError(null);
    try {
      const res = await fetch('/api/espn/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: leagueId.trim(), season, name: leagueName.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setLeagueError(data.error ?? 'Failed to add league'); return; }
      setLeagues((prev) => [...prev, data.league]);
      setLeagueId('');
      setLeagueName('');
      setShowAddForm(false);
    } catch {
      setLeagueError('Could not save — try again');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (lid: string, s: string) => {
    await fetch('/api/espn/leagues', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: lid, season: s }),
    });
    setLeagues((prev) => prev.filter((l) => !(l.leagueId === lid && l.season === s)));
  };

  const verifyCreds = async () => {
    if (!swid.trim() || !espnS2.trim()) { setCredError('Both fields are required'); return; }
    setVerifying(true);
    setCredError(null);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/espn/credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swid: swid.trim(), espnS2: espnS2.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCredError(data.error ?? 'Could not verify — check your cookies'); return; }
      setVerifyResult(data);
    } catch {
      setCredError('Could not reach ESPN — try again');
    } finally {
      setVerifying(false);
    }
  };

  const saveCreds = async () => {
    setSavingCreds(true);
    setCredError(null);
    try {
      const res = await fetch('/api/espn/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swid: swid.trim(), espnS2: espnS2.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCredError(data.error ?? 'Failed to save'); return; }
      setCredsConnected(true);
      setShowCredForm(false);
      setVerifyResult(null);
      setSwid('');
      setEspnS2('');
      if (Array.isArray(data.leagues) && data.leagues.length > 0) {
        setLeagues((prev) => {
          const existing = new Set(prev.map((l) => `${l.leagueId}-${l.season}`));
          const fresh = (data.leagues as EspnLeague[]).filter((l) => !existing.has(`${l.leagueId}-${l.season}`));
          return [...prev, ...fresh];
        });
        setSyncMsg(`Found ${data.leaguesDiscovered} league${data.leaguesDiscovered !== 1 ? 's' : ''} automatically`);
      } else {
        setSyncMsg('Credentials saved — add your leagues below');
      }
    } catch {
      setCredError('Something went wrong — try again');
    } finally {
      setSavingCreds(false);
    }
  };

  const syncLeagues = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/espn/leagues/sync');
      const data = await res.json();
      if (!res.ok) { setSyncMsg(data.error ?? 'Sync failed'); return; }
      if (Array.isArray(data.leagues)) {
        setLeagues((prev) => {
          const existing = new Set(prev.map((l) => `${l.leagueId}-${l.season}`));
          const fresh = (data.leagues as EspnLeague[]).filter((l) => !existing.has(`${l.leagueId}-${l.season}`));
          return [...prev, ...fresh];
        });
      }
      setSyncMsg(data.leaguesDiscovered > 0
        ? `Synced ${data.leaguesDiscovered} league${data.leaguesDiscovered !== 1 ? 's' : ''}`
        : 'No new leagues found',
      );
    } catch {
      setSyncMsg('Sync failed — try again');
    } finally {
      setSyncing(false);
    }
  };

  const disconnectCreds = async () => {
    await fetch('/api/espn/credentials', { method: 'DELETE' });
    setCredsConnected(false);
    setShowCredForm(false);
  };

  const cancelCredForm = () => {
    setShowCredForm(false);
    setCredError(null);
    setSwid('');
    setEspnS2('');
    setVerifyResult(null);
    setShowInstructions(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0a0c14] shadow-sm dark:shadow-none overflow-hidden">

      {/* ── Card header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
          <FiWifi className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ESPN Leagues</p>
          <p className="text-[11px] text-zinc-500">Connect and manage your ESPN fantasy leagues</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {credsConnected && (
            <button
              onClick={syncLeagues}
              disabled={syncing}
              title="Sync leagues from ESPN"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-400/40 disabled:opacity-40 transition-colors"
            >
              <FiRefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <span className="rounded-full border border-red-500/20 bg-red-500/5 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600 dark:text-red-400">
            ESPN
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* ── Sync message ── */}
        {syncMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{syncMsg}</p>
            <button onClick={() => setSyncMsg(null)} className="ml-3 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">✕</button>
          </div>
        )}

        {/* ── Account access ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${credsConnected ? 'bg-emerald-500/15' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                {credsConnected
                  ? <FiCheck className="h-3 w-3 text-emerald-500" />
                  : <FiLock className="h-3 w-3 text-zinc-400" />}
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {credsConnected ? 'Private access connected' : 'Private league access'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {credsConnected && !showCredForm && (
                <button onClick={disconnectCreds} className="text-[11px] text-zinc-400 hover:text-red-400 transition-colors">
                  Disconnect
                </button>
              )}
              <button
                onClick={() => showCredForm ? cancelCredForm() : setShowCredForm(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                {showCredForm
                  ? 'Cancel'
                  : credsConnected
                    ? <><FiUnlock className="h-3 w-3" /> Update</>
                    : <><FiLock className="h-3 w-3" /> Set up</>}
              </button>
            </div>
          </div>

          {!credsConnected && !showCredForm && (
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Add your ESPN cookies once to unlock private league data. Public leagues don&apos;t require this.
            </p>
          )}

          {/* Credential form */}
          {showCredForm && (
            <div className="mt-3 space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/30 p-4">

              {/* Instructions toggle */}
              <button
                onClick={() => setShowInstructions((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <span>How to find your ESPN cookies</span>
                {showInstructions ? <FiChevronUp className="h-3.5 w-3.5 shrink-0" /> : <FiChevronDown className="h-3.5 w-3.5 shrink-0" />}
              </button>

              {showInstructions && (
                <ol className="space-y-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/40 p-3">
                  {[
                    <>Open <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">fantasy.espn.com</span> and make sure you&apos;re logged in.</>,
                    <>Right-click anywhere → <strong className="text-zinc-700 dark:text-zinc-300">Inspect</strong>, or press <span className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">F12</span> / <span className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">Cmd+Opt+I</span>.</>,
                    <>Click the <strong className="text-zinc-700 dark:text-zinc-300">Application</strong> tab in DevTools.</>,
                    <>In the left sidebar, expand <strong className="text-zinc-700 dark:text-zinc-300">Cookies</strong> → click <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">https://fantasy.espn.com</span>.</>,
                    <>Find <span className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">SWID</span> — copy its value <strong className="text-zinc-700 dark:text-zinc-300">including the curly braces</strong>.</>,
                    <>Find <span className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">espn_s2</span> — copy the full long value.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span className="shrink-0 font-bold text-zinc-400 dark:text-zinc-500">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                  <li className="mt-1 flex gap-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-2 py-1.5 text-[11px] text-blue-600 dark:text-blue-400">
                    <FiAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    Stored securely and only used to fetch your league data. Usually lasts the full season.
                  </li>
                </ol>
              )}

              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    SWID <span className="text-zinc-400">(include curly braces)</span>
                  </label>
                  <input
                    type="text"
                    value={swid}
                    onChange={(e) => { setSwid(e.target.value); setVerifyResult(null); }}
                    placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">espn_s2</label>
                  <textarea
                    value={espnS2}
                    onChange={(e) => { setEspnS2(e.target.value); setVerifyResult(null); }}
                    placeholder="AEB…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                  />
                </div>
              </div>

              {/* Verify result */}
              {verifyResult && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                      <FiCheck className="h-3 w-3 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Cookies accepted by ESPN</p>
                  </div>
                  {verifyResult.displayName
                    ? <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{verifyResult.displayName}</p>
                    : <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">ESPN account confirmed</p>}
                  <p className="font-mono text-[10px] text-zinc-400">{verifyResult.swidPreview}</p>
                  {verifyResult.leagueCount > 0 ? (
                    <ul className="space-y-0.5 pt-0.5">
                      {verifyResult.leagues.map((l, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <span className="h-1 w-1 rounded-full bg-zinc-400 shrink-0" />
                          {l.name ?? `League ${l.leagueId}`}
                          <span className="text-zinc-400">({l.season})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-zinc-500">
                      No leagues auto-detected (2019–2026). You can add them manually below after saving.
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400">Is this you? Click <strong>Confirm &amp; Save</strong> to continue.</p>
                </div>
              )}

              {credError && <p className="text-[11px] text-red-500 dark:text-red-400">{credError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                {!verifyResult ? (
                  <button
                    onClick={verifyCreds}
                    disabled={verifying || !swid.trim() || !espnS2.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {verifying ? 'Checking…' : 'Verify Account'}
                  </button>
                ) : (
                  <button
                    onClick={saveCreds}
                    disabled={savingCreds}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {savingCreds ? 'Saving…' : 'Confirm & Save'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/60" />

        {/* ── Leagues ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Your Leagues {leagues.length > 0 && <span className="ml-1 text-zinc-400 font-normal">({leagues.length})</span>}
            </p>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-red-400/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <FiPlus className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/30 p-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">League ID</label>
                <input
                  type="text"
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                  placeholder="e.g. 221996973  (from the ESPN URL)"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">League name <span className="text-zinc-400">(optional)</span></label>
                  <input
                    type="text"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="My ESPN League"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Season</label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="h-[38px] rounded-xl border border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/60 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-red-500/50 transition"
                  >
                    {['2026','2025','2024','2023','2022','2021','2020','2019'].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {leagueError && <p className="text-[11px] text-red-500 dark:text-red-400">{leagueError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddForm(false); setLeagueId(''); setLeagueName(''); setLeagueError(null); }}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={add}
                  disabled={adding || !leagueId.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {adding ? 'Adding…' : 'Add League'}
                </button>
              </div>
            </div>
          )}

          {/* League list */}
          {leagues.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic">
              No leagues added yet. Use the <strong className="not-italic font-semibold text-zinc-600 dark:text-zinc-400">Add</strong> button above, or find your league ID in the ESPN URL:{' '}
              <span className="font-mono text-[10px] text-zinc-400">leagueId=123456</span>
            </p>
          ) : (
            <ul className="space-y-2">
              {leagues.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {l.name ?? `League ${l.leagueId}`}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {l.season}{l.teamCount ? ` · ${l.teamCount} teams` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/espn/${l.leagueId}?season=${l.season}`}
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="View league"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => remove(l.leagueId, l.season)}
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
