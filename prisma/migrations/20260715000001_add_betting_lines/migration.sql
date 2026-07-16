CREATE TABLE "BetLine" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "matchupId" INTEGER NOT NULL,
    "homeRosterId" INTEGER NOT NULL,
    "awayRosterId" INTEGER NOT NULL,
    "homeName" TEXT NOT NULL,
    "awayName" TEXT NOT NULL,
    "homeProjected" DOUBLE PRECISION NOT NULL,
    "awayProjected" DOUBLE PRECISION NOT NULL,
    "homeOdds" DOUBLE PRECISION NOT NULL,
    "awayOdds" DOUBLE PRECISION NOT NULL,
    "totalLine" DOUBLE PRECISION NOT NULL,
    "overOdds" DOUBLE PRECISION NOT NULL DEFAULT 1.9,
    "underOdds" DOUBLE PRECISION NOT NULL DEFAULT 1.9,
    "status" TEXT NOT NULL DEFAULT 'open',
    "homeScore" DOUBLE PRECISION,
    "awayScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "BetLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BetWager" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "pick" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "payout" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "BetWager_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetLine_hubLeagueId_season_week_matchupId_key" ON "BetLine"("hubLeagueId", "season", "week", "matchupId");
CREATE INDEX "BetLine_hubLeagueId_idx" ON "BetLine"("hubLeagueId");
CREATE INDEX "BetLine_status_idx" ON "BetLine"("status");

CREATE UNIQUE INDEX "BetWager_lineId_profileId_pick_key" ON "BetWager"("lineId", "profileId", "pick");
CREATE INDEX "BetWager_lineId_idx" ON "BetWager"("lineId");
CREATE INDEX "BetWager_profileId_idx" ON "BetWager"("profileId");

ALTER TABLE "BetLine" ADD CONSTRAINT "BetLine_hubLeagueId_fkey"
    FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BetWager" ADD CONSTRAINT "BetWager_lineId_fkey"
    FOREIGN KEY ("lineId") REFERENCES "BetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BetWager" ADD CONSTRAINT "BetWager_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
