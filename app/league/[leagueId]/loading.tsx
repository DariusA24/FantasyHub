export default function LeagueLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#05060a]">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 animate-pulse">
        <div className="mb-6 h-4 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-8 h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800/50" />
        <div className="rounded-2xl bg-zinc-200 dark:bg-zinc-800/50 overflow-hidden">
          <div className="h-12 border-b border-zinc-300 dark:border-zinc-700" />
          <div className="h-10 border-b border-zinc-300 dark:border-zinc-700" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 border-b border-zinc-100 dark:border-zinc-800/40 last:border-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
