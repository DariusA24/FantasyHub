-- CreateTable
CREATE TABLE "HubLeagueChampion" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "winnerName" TEXT NOT NULL,
    "teamName" TEXT,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueChampion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueChampion_hubLeagueId_idx" ON "HubLeagueChampion"("hubLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueChampion_hubLeagueId_season_key" ON "HubLeagueChampion"("hubLeagueId", "season");

-- AddForeignKey
ALTER TABLE "HubLeagueChampion" ADD CONSTRAINT "HubLeagueChampion_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;
