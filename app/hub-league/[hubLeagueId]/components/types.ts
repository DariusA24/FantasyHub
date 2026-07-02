export type SeasonGlance = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  rank: number;
};

export type MatchupTeam = {
  displayName: string;
  points: number;
  projectedPoints: number;
};

export type MatchupData = {
  week: number;
  seasonType: string;
  seasonGlance?: SeasonGlance;
  matchup: {
    myTeam: MatchupTeam;
    opponent: MatchupTeam | null;
  } | null;
};

export type PowerRankingTeam = {
  rank: number;
  displayName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  isMe: boolean;
};
