-- Allow unauthenticated (guest) votes on start/sit matchups
ALTER TABLE "StartSitVote" ALTER COLUMN "profileId" DROP NOT NULL;
ALTER TABLE "StartSitVote" ADD COLUMN "guestToken" TEXT;
CREATE UNIQUE INDEX "StartSitVote_matchupId_guestToken_key" ON "StartSitVote"("matchupId", "guestToken");
