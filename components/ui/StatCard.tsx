export default function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="flex flex-col justify-between w-full rounded-2xl bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 p-5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-amber-600 dark:text-[#F4D06F]">{value}</div>
    </div>
  );
}
