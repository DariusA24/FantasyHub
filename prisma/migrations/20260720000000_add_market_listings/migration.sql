-- CreateTable
CREATE TABLE "LeagueMarketListing" (
    "id" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sleeperLeagueId" TEXT,
    "leagueName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "scoring" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "entryFee" INTEGER,
    "spotsAvailable" INTEGER,
    "record" TEXT,
    "standingPosition" INTEGER,
    "description" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeagueMarketListing_status_createdAt_idx" ON "LeagueMarketListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LeagueMarketListing_creatorId_idx" ON "LeagueMarketListing"("creatorId");

-- AddForeignKey
ALTER TABLE "LeagueMarketListing" ADD CONSTRAINT "LeagueMarketListing_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
