-- CreateTable
CREATE TABLE "HubLeague" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubLeagueSeason" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sleeperName" TEXT,
    "sleeperSport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueSeason_sleeperLeagueId_idx" ON "HubLeagueSeason"("sleeperLeagueId");

-- CreateIndex
CREATE INDEX "HubLeagueSeason_hubLeagueId_season_idx" ON "HubLeagueSeason"("hubLeagueId", "season");

-- AddForeignKey
ALTER TABLE "HubLeague" ADD CONSTRAINT "HubLeague_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeagueSeason" ADD CONSTRAINT "HubLeagueSeason_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
