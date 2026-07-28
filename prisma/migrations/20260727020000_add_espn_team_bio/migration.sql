-- CreateTable
CREATE TABLE "EspnTeamBio" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "bio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EspnTeamBio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EspnTeamBio_leagueId_season_idx" ON "EspnTeamBio"("leagueId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "EspnTeamBio_leagueId_season_teamId_key" ON "EspnTeamBio"("leagueId", "season", "teamId");
