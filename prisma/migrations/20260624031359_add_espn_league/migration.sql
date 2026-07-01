-- CreateTable
CREATE TABLE "EspnLeague" (
    "id" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "leagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "name" TEXT,
    "teamCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspnLeague_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EspnLeague_profileId_idx" ON "EspnLeague"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "EspnLeague_profileId_leagueId_season_key" ON "EspnLeague"("profileId", "leagueId", "season");

-- AddForeignKey
ALTER TABLE "EspnLeague" ADD CONSTRAINT "EspnLeague_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
