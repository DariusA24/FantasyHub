import { Trophy, BarChart3, Award } from "lucide-react";
import StatCard from "./StatCard";

type StatsRowProps = {
    leaguesJoinedCount?: number;
    winRate?: number; // percentage, 0–100
    fantasyHubRank?: string;
};

export default function StatsRow({leaguesJoinedCount, winRate = 0, fantasyHubRank}: StatsRowProps) {
  const formattedWinRate = `${winRate.toFixed(1)}%`;

  return (
    <section className="w-full mt-6 px-8">
  <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-6">
    <StatCard
      icon={<Trophy size={18} className="text-yellow-400" />}
      label="Leagues Joined"
      value={leaguesJoinedCount ?? 0}
    />
    <StatCard
      icon={<BarChart3 size={18} className="text-yellow-400" />}
      label="Win Rate"
      value={formattedWinRate}
    />
    <StatCard
      icon={<Award size={18} className="text-yellow-400" />}
      label="FantasyHub Rank"
      value={fantasyHubRank ?? "N/A"}
    />
  </div>
</section>
  );
}