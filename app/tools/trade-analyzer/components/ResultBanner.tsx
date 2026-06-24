"use client";

export function ResultBanner({ myTotal, theirTotal, myBenchBonus, theirBenchBonus }: {
  myTotal: number;
  theirTotal: number;
  myBenchBonus: number;
  theirBenchBonus: number;
}) {
  if (myTotal === 0 && theirTotal === 0) return null;

  const adjustedMy    = myTotal + myBenchBonus;
  const adjustedTheir = theirTotal + theirBenchBonus;
  const diff = adjustedMy - adjustedTheir;
  const base = Math.max(adjustedMy, adjustedTheir);
  const pct  = base > 0 ? Math.round(Math.abs(diff / base) * 100) : 0;
  const bonusSide = myBenchBonus > 0 ? "your side" : theirBenchBonus > 0 ? "their side" : null;
  const bonusAmt  = myBenchBonus || theirBenchBonus;

  let label = "Even trade";
  let color = "text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/40";
  if (diff > 0) {
    label = `You win by ${diff.toLocaleString()} pts (${pct}%)`;
    color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  }
  if (diff < 0) {
    label = `You lose by ${Math.abs(diff).toLocaleString()} pts (${pct}%)`;
    color = "text-red-400 border-red-500/30 bg-red-500/10";
  }

  return (
    <div className={`rounded-2xl border px-5 py-3 text-center ${color}`}>
      <p className="text-sm font-semibold">{label}</p>
      {bonusSide && (
        <p className="mt-1 text-[10px] text-zinc-500">
          Includes +{bonusAmt.toLocaleString()} bench spot bonus ({bonusSide} sending more players)
        </p>
      )}
    </div>
  );
}
