import { getLeague, getLeagueRosters, getLeagueMatchups, getLeagueUsers } from '@/utils/sleeperService';
import { prisma } from '@/utils/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiUsers } from 'react-icons/fi';
import HubLeagueButton from './HubLeagueButton';
import { LeagueNav } from './LeagueNav';
import { SeasonAtAGlance } from '@/app/hub-league/[hubLeagueId]/components/SeasonAtAGlance';
import { WeekMatchup } from '@/app/hub-league/[hubLeagueId]/components/WeekMatchup';
import { PowerRankingsCard } from '@/app/hub-league/[hubLeagueId]/components/PowerRankingsCard';
import type { SeasonGlance, PowerRankingTeam } from '@/app/hub-league/[hubLeagueId]/components/types';

function avatarUrl(hash: string | null | undefined) {
  if (!hash) return null;
  return `https://sleepercdn.com/avatars/thumbs/${hash}`;
}

function scoringLabel(league: any): string {
  const rec = league?.scoring_settings?.rec ?? 0;
  if (rec === 1) return 'PPR';
  if (rec === 0.5) return 'Half PPR';
  return 'Standard';
}

function pts(integer: number, decimal: number): number {
  return integer + decimal / 100;
}

function statusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'in_season': return { label: 'In Season', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    case 'complete':  return { label: 'Complete',  classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' };
    case 'pre_draft': return { label: 'Pre Draft', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    default:          return { label: status ?? 'Unknown', classes: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
  }
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function PublicLeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;

  // Get current NFL week
  const stateRes = await fetch('https://api.sleeper.app/v1/state/nfl', { next: { revalidate: 1800 } });
  const nflState = stateRes.ok ? await stateRes.json() : { week: 1 };
  const currentWeek = Math.max(1, nflState.week ?? 1);

  const [league, rosters, users, matchups] = await Promise.all([
    getLeague(leagueId).catch(() => null),
    getLeagueRosters(leagueId).catch(() => []),
    getLeagueUsers(leagueId).catch(() => []),
    getLeagueMatchups(leagueId, currentWeek).catch(() => []),
  ]);

  if (!league) notFound();

  // Fetch trades for the last 3 weeks
  const weeks = [currentWeek, currentWeek - 1, currentWeek - 2].filter(w => w >= 1);
  const txResponses = await Promise.all(
    weeks.map(w =>
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${w}`, {
        next: { revalidate: 1800 },
      })
    )
  );

  const allTrades: any[] = [];
  for (const res of txResponses) {
    if (!res.ok) continue;
    const txs: any[] = await res.json();
    allTrades.push(...txs.filter((t: any) => t.type === 'trade' && t.status === 'complete'));
  }
  allTrades.sort((a, b) => b.created - a.created);
  const recentTradesRaw = allTrades.slice(0, 5);

  // Resolve player names
  const playerIds = new Set<string>();
  for (const trade of recentTradesRaw) {
    if (trade.adds) Object.keys(trade.adds).forEach((id: string) => playerIds.add(id));
  }
  const dbPlayers = await prisma.sleeperPlayer.findMany({
    where: { id: { in: Array.from(playerIds) } },
    select: { id: true, full_name: true, position: true },
  });
  const playerMap = new Map(dbPlayers.map(p => [p.id, p]));

  const userMap = new Map<string, any>(users.map((u: any) => [u.user_id, u]));
  const commissioner = users.find((u: any) => u.is_owner);
  const rosterOwnerMap = new Map<number, string>(rosters.map((r: any) => [r.roster_id, r.owner_id]));

  // Enrich trades
  const recentTrades = recentTradesRaw.map((trade: any) => {
    const byRoster = new Map<number, { players: { name: string; position: string | null }[]; picks: string[] }>();

    if (trade.adds) {
      for (const [playerId, rosterId] of Object.entries(trade.adds as Record<string, number>)) {
        if (!byRoster.has(rosterId)) byRoster.set(rosterId, { players: [], picks: [] });
        const p = playerMap.get(playerId);
        byRoster.get(rosterId)!.players.push({
          name: p?.full_name ?? `Player ${playerId}`,
          position: p?.position ?? null,
        });
      }
    }

    if (trade.draft_picks) {
      for (const pick of trade.draft_picks as any[]) {
        const rosterId: number = pick.owner_id ?? pick.roster_id_to;
        if (!byRoster.has(rosterId)) byRoster.set(rosterId, { players: [], picks: [] });
        byRoster.get(rosterId)!.picks.push(`${pick.season} Rd ${pick.round}`);
      }
    }

    const teams = Array.from(byRoster.entries()).map(([rosterId, assets]) => {
      const ownerId = rosterOwnerMap.get(rosterId);
      const displayName = ownerId ? (userMap.get(ownerId)?.display_name ?? 'Unknown') : 'Unknown';
      return { displayName, ...assets };
    });

    return { transaction_id: trade.transaction_id as string, when: timeAgo(trade.created), teams };
  });

  // Build standings
  const standings = rosters
    .map((r: any) => {
      const user    = userMap.get(r.owner_id) ?? null;
      const wins    = r.settings?.wins ?? 0;
      const losses  = r.settings?.losses ?? 0;
      const ties    = r.settings?.ties ?? 0;
      const pf      = pts(r.settings?.fpts ?? 0, r.settings?.fpts_decimal ?? 0);
      const pa      = pts(r.settings?.fpts_against ?? 0, r.settings?.fpts_against_decimal ?? 0);
      const gp      = wins + losses + ties;
      const winPct  = gp > 0 ? ((wins + ties * 0.5) / gp) * 100 : 0;
      return { user, wins, losses, ties, pf, pa, winPct, rosterId: r.roster_id };
    })
    .sort((a: any, b: any) => b.wins - a.wins || b.pf - a.pf);

  const topTeam = standings[0];

  // Build SeasonAtAGlance data from the league leader
  const seasonGlance: SeasonGlance | undefined = topTeam
    ? {
        wins: topTeam.wins,
        losses: topTeam.losses,
        ties: topTeam.ties,
        pointsFor: topTeam.pf,
        pointsAgainst: topTeam.pa,
        streak: '—',
        rank: 1,
      }
    : undefined;

  // Build WeekMatchup from the highest-scoring pair this week
  let weekMatchup: { myTeam: { displayName: string; points: number; projectedPoints: number }; opponent: { displayName: string; points: number; projectedPoints: number } | null } | null = null;
  if (matchups.length > 0) {
    const groups = new Map<number, any[]>();
    for (const m of matchups as any[]) {
      if (m.matchup_id) {
        if (!groups.has(m.matchup_id)) groups.set(m.matchup_id, []);
        groups.get(m.matchup_id)!.push(m);
      }
    }
    let bestPair: any[] | null = null;
    let bestCombined = -1;
    for (const [, pair] of groups) {
      if (pair.length === 2) {
        const combined = (pair[0].points ?? 0) + (pair[1].points ?? 0);
        if (combined > bestCombined) { bestCombined = combined; bestPair = pair; }
      }
    }
    if (bestPair) {
      const getName = (rosterId: number) => {
        const ownerId = rosterOwnerMap.get(rosterId);
        const u = ownerId ? userMap.get(ownerId) : null;
        return u?.metadata?.team_name || u?.display_name || `Team ${rosterId}`;
      };
      weekMatchup = {
        myTeam:   { displayName: getName(bestPair[0].roster_id), points: bestPair[0].points ?? 0, projectedPoints: 0 },
        opponent: { displayName: getName(bestPair[1].roster_id), points: bestPair[1].points ?? 0, projectedPoints: 0 },
      };
    }
  }

  // Build PowerRankings from standings
  const powerRankings: PowerRankingTeam[] = standings.slice(0, 5).map((team: any, i: number) => ({
    rank: i + 1,
    displayName: team.user?.metadata?.team_name || team.user?.display_name || `Team ${team.rosterId}`,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: team.pf,
    isMe: false,
  }));

  const { label: statusText, classes: statusClasses } = statusBadge(league.status);
  const commAv = avatarUrl(commissioner?.avatar);

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">

        <LeagueNav />

        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <HubLeagueButton league={{
            league_id: league.league_id,
            name: league.name,
            season: league.season,
            sport: league.sport,
            avatar: league.avatar ?? null,
            previous_league_id: league.previous_league_id ?? null,
          }} />
        </div>

        {/* ─── Hero ─────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/60 dark:border-zinc-800/70 dark:bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Public League
            </div>

            <h1 className="bg-gradient-to-r from-[#F4D06F] via-[#f9f0c2] to-[#F4D06F] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
              {league.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                {league.sport}
              </span>
              <span className="rounded-full border border-[#F4D06F]/20 bg-[#F4D06F]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#F4D06F]">
                {league.season} Season
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {scoringLabel(league)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700/60 dark:bg-zinc-900/60 px-2.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <FiUsers className="h-3 w-3" />
                {league.total_rosters} teams
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClasses}`}>
                {statusText}
              </span>
            </div>
          </div>

          {/* Commissioner card — no hub owner bio */}
          {commissioner && (
            <div className="shrink-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/50 px-4 py-3 flex items-center gap-3 min-w-[180px]">
              {commAv ? (
                <Image src={commAv} alt={commissioner.display_name} width={36} height={36}
                  className="h-9 w-9 rounded-full border border-[#F4D06F]/40 object-cover shrink-0" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4D06F]/15 text-sm font-black text-[#F4D06F]">
                  {commissioner.display_name?.[0]?.toUpperCase() ?? 'C'}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F4D06F]/70">Commissioner</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{commissioner.display_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Stat Cards ───────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SeasonAtAGlance
            loaded={true}
            seasonGlance={seasonGlance}
          />
          <WeekMatchup
            loaded={true}
            week={currentWeek}
            matchup={weekMatchup}
          />
          <PowerRankingsCard
            loaded={true}
            rankings={powerRankings}
          />
        </div>

        {/* ─── Standings + Managers ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">

          {/* Standings */}
          <section className="hub-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Standings</h2>
            </div>

            <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-x-3 px-5 py-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 border-b border-zinc-100 dark:border-zinc-800/40">
              <span>#</span>
              <span>Manager</span>
              <span className="w-16 text-right">Record</span>
              <span className="w-16 text-right">PF</span>
              <span className="w-12 text-right">Win%</span>
            </div>

            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {standings.map((row: any, i: number) => {
                const teamName  = row.user?.metadata?.team_name || row.user?.display_name || `Team ${row.rosterId}`;
                const manager   = row.user?.display_name || row.user?.username || '—';
                const av        = avatarUrl(row.user?.avatar);
                const rankColor = i === 0 ? 'text-amber-500 dark:text-[#F4D06F]'
                                : i === 1 ? 'text-zinc-400'
                                : i === 2 ? 'text-amber-700 dark:text-amber-600'
                                : 'text-zinc-400 dark:text-zinc-600';

                return (
                  <li key={row.rosterId}
                    className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-x-3 px-5 py-3 ${i < 3 ? 'bg-amber-50/30 dark:bg-amber-500/[0.03]' : ''}`}
                  >
                    <span className={`text-sm font-black ${rankColor}`}>{i + 1}</span>

                    <div className="flex items-center gap-2.5 min-w-0">
                      {av ? (
                        <Image src={av} alt={manager} width={32} height={32}
                          className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500">
                          {manager[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{teamName}</p>
                        {row.user?.metadata?.team_name && (
                          <p className="text-[11px] text-zinc-500 truncate">@{manager}</p>
                        )}
                      </div>
                    </div>

                    <span className="w-16 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                      {row.wins}–{row.losses}{row.ties > 0 ? `–${row.ties}` : ''}
                    </span>
                    <span className="w-16 text-right text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {row.pf.toFixed(2)}
                    </span>
                    <span className={`w-12 text-right text-xs font-semibold tabular-nums ${row.winPct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {row.winPct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Managers sidebar */}
          <section className="hub-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Managers</h2>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {users.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {users.map((u: any) => {
                const av = avatarUrl(u.avatar);
                return (
                  <li key={u.user_id} className="hub-inner-card flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                    {av ? (
                      <Image src={av} alt={u.display_name} width={28} height={28}
                        className="h-7 w-7 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shrink-0" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500">
                        {u.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{u.display_name}</p>
                      {u.is_owner && (
                        <span className="mt-0.5 inline-block rounded-full border px-1.5 text-[9px] font-medium bg-[#F4D06F]/15 text-[#F4D06F] border-[#F4D06F]/30">
                          commissioner
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* ─── Recent Trades ─────────────────────────────────── */}
        <section className="mt-4 hub-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Recent Trades</h2>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400">
              Live
            </span>
          </div>

          {recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-zinc-500">No trades in the last 3 weeks</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentTrades.map((trade: any) => (
                <li key={trade.transaction_id} className="hub-inner-card rounded-xl px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                      {trade.teams.map((t: any) => t.displayName).join(' ↔ ')}
                    </p>
                    <span className="shrink-0 text-[10px] text-gray-300 dark:text-zinc-600">{trade.when}</span>
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${trade.teams.length}, 1fr)` }}>
                    {trade.teams.map((team: any) => (
                      <div key={team.displayName}>
                        <p className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-zinc-600 mb-1">
                          {team.displayName} gets
                        </p>
                        <div className="space-y-0.5">
                          {team.players.map((p: any) => (
                            <p key={p.name} className="text-[11px] font-medium text-emerald-400 truncate">
                              {p.name}
                              {p.position && <span className="ml-1 text-zinc-600">{p.position}</span>}
                            </p>
                          ))}
                          {team.picks.map((pick: string) => (
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
  );
}
