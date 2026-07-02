-- CreateTable
CREATE TABLE "HubLeagueAward" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sleeperUserId" TEXT NOT NULL,
    "profileId" INTEGER,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" TEXT,
    "week" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueAward_hubLeagueId_season_idx" ON "HubLeagueAward"("hubLeagueId", "season");

-- CreateIndex
CREATE INDEX "HubLeagueAward_profileId_idx" ON "HubLeagueAward"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueAward_hubLeagueId_season_type_sleeperUserId_key" ON "HubLeagueAward"("hubLeagueId", "season", "type", "sleeperUserId");

-- AddForeignKey
ALTER TABLE "HubLeagueAward" ADD CONSTRAINT "HubLeagueAward_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeagueAward" ADD CONSTRAINT "HubLeagueAward_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
