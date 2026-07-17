"use client";

export function ResultBanner({ myTotal, theirTotal, myWaiverAdj, theirWaiverAdj }: {
  myTotal: number;
  theirTotal: number;
  myWaiverAdj: number;
  theirWaiverAdj: number;
}) {
  if (myTotal === 0 && theirTotal === 0) return null;

  const adjustedMy    = myTotal + myWaiverAdj;
  const adjustedTheir = theirTotal + theirWaiverAdj;
  const diff = adjustedTheir - adjustedMy;
  const gap  = Math.abs(diff);
  const base = Math.max(adjustedMy, adjustedTheir);
  const pct  = base > 0 ? Math.round((gap / base) * 100) : 0;
  const total = adjustedMy + adjustedTheir;
  const giveWidth = total > 0 ? Math.max(4, Math.min(96, (adjustedMy / total) * 100)) : 50;

  const adjSide = myWaiverAdj > 0 ? "your side" : theirWaiverAdj > 0 ? "their side" : null;
  const adjAmt  = myWaiverAdj || theirWaiverAdj;

  const oneSided = myTotal === 0 || theirTotal === 0;

  let label: string;
  let sub: string | null = null;
  let color: string;

  if (oneSided) {
    label = "Add assets to both sides to compare";
    color = "text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40";
  } else if (pct < 5) {
    label = "Fair trade";
    sub = `Within ${pct}% — value is essentially even`;
    color = "text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40";
  } else if (pct < 12) {
    label = diff > 0 ? "Slight edge to you" : "Slight edge to them";
    sub = diff > 0
      ? `You get ${gap.toLocaleString()} (${pct}%) more value`
      : `You give up ${gap.toLocaleString()} (${pct}%) more value`;
    color = "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
  } else {
    label = diff > 0 ? "You win this trade" : "You lose this trade";
    sub = diff > 0
      ? `You get ${gap.toLocaleString()} (${pct}%) more value`
      : `You give up ${gap.toLocaleString()} (${pct}%) more value`;
    color = diff > 0
      ? "text-emerald-500 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : "text-red-500 dark:text-red-400 border-red-500/30 bg-red-500/10";
  }

  return (
    <div className={`rounded-2xl border px-4 md:px-5 py-3 ${color}`}>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400/80">{sub}</p>}
      </div>

      {!oneSided && (
        <div className="mt-2.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800/60">
            <div className="bg-amber-500/70 dark:bg-amber-400/70 transition-all duration-300" style={{ width: `${giveWidth}%` }} />
            <div className="bg-blue-500/70 dark:bg-blue-400/70 transition-all duration-300" style={{ width: `${100 - giveWidth}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400/80">
            <span>You give <span className="font-bold text-amber-600 dark:text-amber-400">{adjustedMy.toLocaleString()}</span></span>
            <span>You get <span className="font-bold text-blue-600 dark:text-blue-400">{adjustedTheir.toLocaleString()}</span></span>
          </div>
        </div>
      )}

      {adjSide && (
        <p className="mt-1.5 text-center text-[10px] text-zinc-500">
          Includes a +{adjAmt.toLocaleString()} waiver adjustment on {adjSide} — the team sending more players refills its open roster spots from waivers
        </p>
      )}
    </div>
  );
}
