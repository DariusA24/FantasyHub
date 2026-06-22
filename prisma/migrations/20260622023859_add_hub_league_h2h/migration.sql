-- CreateTable
CREATE TABLE "HubLeagueH2H" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sleeperUserId" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "opponentDisplayName" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueH2H_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueH2H_hubLeagueId_sleeperUserId_idx" ON "HubLeagueH2H"("hubLeagueId", "sleeperUserId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueH2H_hubLeagueId_season_sleeperUserId_opponentUserI_key" ON "HubLeagueH2H"("hubLeagueId", "season", "sleeperUserId", "opponentUserId");

-- AddForeignKey
ALTER TABLE "HubLeagueH2H" ADD CONSTRAINT "HubLeagueH2H_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;
