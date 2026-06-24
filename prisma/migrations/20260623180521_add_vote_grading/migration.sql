-- AlterTable
ALTER TABLE "StartSitVote" ADD COLUMN     "correct" BOOLEAN;

-- CreateTable
CREATE TABLE "UserPredictionStat" (
    "id" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "correctPicks" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'rookie',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPredictionStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPredictionStat_profileId_key" ON "UserPredictionStat"("profileId");

-- CreateIndex
CREATE INDEX "UserPredictionStat_tier_correctPicks_idx" ON "UserPredictionStat"("tier", "correctPicks");

-- CreateIndex
CREATE INDEX "StartSitVote_profileId_correct_idx" ON "StartSitVote"("profileId", "correct");

-- AddForeignKey
ALTER TABLE "UserPredictionStat" ADD CONSTRAINT "UserPredictionStat_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
