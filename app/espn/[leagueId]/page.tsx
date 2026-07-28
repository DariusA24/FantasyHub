import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUsers, FiCalendar, FiAward, FiTrendingUp, FiChevronRight, FiShield } from 'react-icons/fi';
import { EspnLeagueNav } from './LeagueNav';
import { LeagueBlog } from '@/app/hub-league/[hubLeagueId]/components/LeagueBlog';
import { loadEspnLeague, POS_COLORS } from './espnData';
import { EspnPrivateNotice } from './EspnStates';
import EspnSeasonPicker from './EspnSeasonPicker';

export default async function EspnLeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const season = seasonParam ?? '2025';
  const seasonQ = `?season=${season}`;

  const result = await loadEspnLeague(leagueId, season);
  if ('error' in result) {
    if (result.error === 'private') return <EspnPrivateNotice />;
    notFound();
  }

  const {
    leagueName, scoringLabel, playoffTeams, regularWeeks, totalWeeks, currentPeriod,
    availableSeasons, myTeamId, rosterSlots, benchCount, irCount, keyScoring, teams, standings,
    managers, recentTrades, highScorer, leagueAvg, highestWeeklyPts,
  } = result.data;

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">

        <EspnLeagueNav />

        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
          <EspnSeasonPicker current={season} seasons={availableSeasons} />
        </div>

        {/* ─── Hero ─────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]" />
              ESPN Fantasy
            </div>

            <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
              {leagueName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                Football
              </span>
              <span className="rounded-full border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F4D06F]">
                {season} Season
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {scoringLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <FiUsers className="h-3 w-3" />
                {teams.length} teams
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Week {currentPeriod} of {totalWeeks}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Stat Cards ───────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: FiAward,      label: 'League Leader',    value: highScorer?.name ?? '—',                        sub: highScorer ? `${highScorer.wins}–${highScorer.losses}` : '' },
            { icon: FiTrendingUp, label: 'Most Points',      value: highScorer ? `${highScorer.pf.toFixed(1)}` : '—', sub: 'pts for' },
            { icon: FiCalendar,   label: 'Best Single Week', value: highestWeeklyPts > 0 ? `${highestWeeklyPts.toFixed(1)}` : '—', sub: 'pts' },
            { icon: FiUsers,      label: 'League Avg PF',    value: `${leagueAvg.toFixed(1)}`,                      sub: 'pts / team' },
          ].map(card => (
            <div key={card.label} className="hub-card p-4">
              <card.icon className="mb-2 h-4 w-4 text-red-500 dark:text-red-400" />
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 truncate">{card.value}</p>
              <p className="text-[10px] text-zinc-500">{card.label}</p>
              {card.sub && <p className="text-[10px] text-zinc-400">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* ─── Quick links to detail pages ──────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { href: `/espn/${leagueId}/rosters${seasonQ}`,   icon: FiUsers,  label: 'Rosters',   desc: 'Every team’s starters, bench and IR' },
            { href: `/espn/${leagueId}/franchise${seasonQ}`, icon: FiShield, label: 'Franchise', desc: 'Team records, points, and results' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="group hub-card flex items-center gap-3 p-4 transition hover:border-red-500/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <link.icon className="h-4 w-4 text-red-500 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{link.label}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{link.desc}</p>
              </div>
              <FiChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
            </Link>
          ))}
        </div>

        {/* ─── Standings + Settings sidebar ─────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">

          {/* Standings */}
          <section className="hub-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Standings</h2>
              {playoffTeams > 0 && (
                <p className="text-[11px] text-zinc-500 mt-0.5">Gold = playoff position</p>
              )}
            </div>

            <div className="grid grid-cols-[1.5rem_1fr_5rem_5rem_4rem_4rem] items-center gap-x-2 px-5 py-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 border-b border-zinc-100 dark:border-zinc-800/40">
              <span>#</span>
              <span>Team</span>
              <span className="text-right">W–L</span>
              <span className="text-right">PF</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Streak</span>
            </div>

            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {standings.map((team, i) => {
                const inPlayoffs = playoffTeams > 0 && i < playoffTeams;
                const rankColor  = i === 0 ? 'text-amber-500 dark:text-[#F4D06F]'
                                 : i === 1 ? 'text-zinc-400'
                                 : i === 2 ? 'text-amber-700 dark:text-amber-600'
                                 : 'text-zinc-400 dark:text-zinc-600';
                const diff = team.pf - team.pa;
                return (
                  <li
                    key={team.id}
                    className={`grid grid-cols-[1.5rem_1fr_5rem_5rem_4rem_4rem] items-center gap-x-2 px-5 py-3 ${inPlayoffs ? 'bg-amber-50/30 dark:bg-amber-500/[0.03]' : ''}`}
                  >
                    <span className={`text-sm font-black ${rankColor}`}>{i + 1}</span>
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-black text-red-600 dark:text-red-400">
                        {team.abbrev.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {team.name}
                          {team.id === myTeamId && <span className="ml-1.5 text-[10px] font-semibold text-red-500 dark:text-red-400">You</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                      {team.wins}–{team.losses}{team.ties > 0 ? `–${team.ties}` : ''}
                    </span>
                    <span className="text-right text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {team.pf.toFixed(1)}
                    </span>
                    <span className={`text-right text-xs font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                    </span>
                    <span className={`text-right text-xs font-bold ${team.streakType === 'W' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {team.streak}{team.streakType}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Settings sidebar */}
          <section className="hub-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">League Settings</h2>
            <div className="space-y-4">

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Roster Slots</p>
                <div className="flex flex-wrap gap-1.5">
                  {rosterSlots.map(s => (
                    <span key={s.name} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${POS_COLORS[s.name] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                      {s.count}× {s.name}
                    </span>
                  ))}
                  {benchCount > 0 && <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-500">{benchCount}× BN</span>}
                  {irCount     > 0 && <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-400">{irCount}× IR</span>}
                </div>
              </div>

              {keyScoring.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Scoring</p>
                  <ul className="space-y-1.5">
                    {keyScoring.map(s => (
                      <li key={s.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">{s.label}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Format</p>
                <ul className="space-y-1.5">
                  {[
                    { label: 'Scoring',       value: scoringLabel },
                    { label: 'Teams',         value: `${teams.length}` },
                    { label: 'Reg Season',    value: `${regularWeeks} weeks` },
                    { label: 'Playoff Teams', value: `${playoffTeams}` },
                  ].map(row => (
                    <li key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">{row.label}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </section>
        </div>

        {/* ─── Managers + Blog + Recent Trades ──────────────── */}
        <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-6 items-start">

          {/* Managers */}
          <section className="md:col-span-1 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Managers</h2>
              <span className="rounded-full bg-gray-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
                {managers.length} total
              </span>
            </div>
            {managers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No managers yet.</p>
            ) : (
              <ul className="space-y-2">
                {managers.map(m => (
                  <li key={m.id} className="hub-inner-card flex items-center gap-2 rounded-xl px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-red-500/10 text-[10px] font-bold text-red-500 dark:text-red-400">
                      {m.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                        {m.displayName}
                      </p>
                      {m.isLeagueManager && (
                        <span className="mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[9px] font-medium capitalize bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30">
                          commissioner
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <LeagueBlog apiBase={`/api/espn/league/${leagueId}`} />

          {/* Recent Trades */}
          <section className="md:col-span-2 hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Recent Trades</h2>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400">
                Live
              </span>
            </div>

            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-zinc-500">No recent trades</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentTrades.map(trade => (
                  <li key={trade.id} className="hub-inner-card rounded-xl px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {trade.teams.map(t => t.displayName).join(' ↔ ')}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-300 dark:text-zinc-600">{trade.when}</span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${trade.teams.length}, 1fr)` }}>
                      {trade.teams.map(team => (
                        <div key={team.displayName}>
                          <p className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-zinc-600 mb-1">
                            {team.displayName} gets
                          </p>
                          <div className="space-y-0.5">
                            {team.players.map(p => (
                              <p key={p.name} className="text-[11px] font-medium text-emerald-400 truncate">
                                {p.name}
                                {p.position && <span className="ml-1 text-zinc-600">{p.position}</span>}
                              </p>
                            ))}
                            {team.picks.map(pick => (
                              <p key={pick} className="text-[11px] font-medium text-[#F4D06F]/80 truncate">
                                {pick}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}
