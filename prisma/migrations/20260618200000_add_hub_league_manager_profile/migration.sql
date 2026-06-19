-- CreateTable
CREATE TABLE "HubLeagueManagerProfile" (
    "id" SERIAL NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "bio" TEXT,
    "playerStyle" TEXT,
    "playerStyleSub" TEXT,
    "favoriteAsset" TEXT,
    "favoriteAssetSub" TEXT,
    "tradeActivity" TEXT,
    "tradeActivitySub" TEXT,
    "favoritePlayerId" TEXT,
    "favoritePlayerSub" TEXT,
    "mode" TEXT,
    "modeSub" TEXT,
    "rival" TEXT,
    "rivalSub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeagueManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueManagerProfile_profileId_idx" ON "HubLeagueManagerProfile"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueManagerProfile_hubLeagueId_profileId_key" ON "HubLeagueManagerProfile"("hubLeagueId", "profileId");

-- AddForeignKey
ALTER TABLE "HubLeagueManagerProfile" ADD CONSTRAINT "HubLeagueManagerProfile_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeagueManagerProfile" ADD CONSTRAINT "HubLeagueManagerProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
