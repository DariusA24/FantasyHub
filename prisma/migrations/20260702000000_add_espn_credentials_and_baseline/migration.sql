-- CreateTable
CREATE TABLE IF NOT EXISTS "ProspectScoutingNote" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectScoutingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlayerSeasonStatsCache" (
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSeasonStatsCache_pkey" PRIMARY KEY ("playerId","season")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerSeasonStatsCache_playerId_idx" ON "PlayerSeasonStatsCache"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProspectScoutingNote_athleteId_isPublic_idx" ON "ProspectScoutingNote"("athleteId", "isPublic");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProspectScoutingNote_authorId_idx" ON "ProspectScoutingNote"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProspectScoutingNote_athleteId_authorId_idx" ON "ProspectScoutingNote"("athleteId", "authorId");

-- AddForeignKey
ALTER TABLE "ProspectScoutingNote" ADD CONSTRAINT "ProspectScoutingNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

-- AlterTable: add ESPN credentials to Profile
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "espnSwid" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "espnS2" TEXT;
