import { User2 } from "lucide-react";

export default function SleeperProfileCard({ username }: { username: string }) {
  return (
    <div className="inline-flex items-center gap-2 border border-zinc-200 dark:border-[#1d212b] px-4 py-2 rounded-xl shadow-sm dark:shadow-[0_0_10px_rgba(0,0,0,0.25)] bg-white dark:bg-[rgba(15,17,23,0.75)] backdrop-blur-md">
      <User2 size={18} className="text-zinc-500 dark:text-gray-300" />
      <span className="text-amber-600 dark:text-[#F4D06F] font-medium">@{username}</span>
    </div>
  );
}