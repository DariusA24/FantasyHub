-- CreateTable
CREATE TABLE "StartSitMatchup" (
    "id" TEXT NOT NULL,
    "playerKey" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartSitMatchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartSitVote" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "chosenPlayerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartSitVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StartSitMatchup_week_season_idx" ON "StartSitMatchup"("week", "season");

-- CreateIndex
CREATE UNIQUE INDEX "StartSitMatchup_playerKey_week_season_key" ON "StartSitMatchup"("playerKey", "week", "season");

-- CreateIndex
CREATE INDEX "StartSitVote_matchupId_idx" ON "StartSitVote"("matchupId");

-- CreateIndex
CREATE INDEX "StartSitVote_profileId_idx" ON "StartSitVote"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StartSitVote_matchupId_profileId_key" ON "StartSitVote"("matchupId", "profileId");

-- AddForeignKey
ALTER TABLE "StartSitVote" ADD CONSTRAINT "StartSitVote_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "StartSitMatchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartSitVote" ADD CONSTRAINT "StartSitVote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
