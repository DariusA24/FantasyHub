-- CreateTable
CREATE TABLE "HubLeagueSeasonStat" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sleeperUserId" TEXT NOT NULL,
    "profileId" INTEGER,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL,
    "pointsAgainst" DOUBLE PRECISION NOT NULL,
    "highWeek" DOUBLE PRECISION NOT NULL,
    "lowWeek" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueSeasonStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueSeasonStat_hubLeagueId_season_idx" ON "HubLeagueSeasonStat"("hubLeagueId", "season");

-- CreateIndex
CREATE INDEX "HubLeagueSeasonStat_profileId_idx" ON "HubLeagueSeasonStat"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueSeasonStat_hubLeagueId_season_sleeperUserId_key" ON "HubLeagueSeasonStat"("hubLeagueId", "season", "sleeperUserId");

-- AddForeignKey
ALTER TABLE "HubLeagueSeasonStat" ADD CONSTRAINT "HubLeagueSeasonStat_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeagueSeasonStat" ADD CONSTRAINT "HubLeagueSeasonStat_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
