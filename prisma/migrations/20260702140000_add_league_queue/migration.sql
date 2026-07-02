CREATE TABLE "LeagueQueuePost" (
    "id" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "scoring" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "entryFee" INTEGER,
    "description" TEXT NOT NULL,
    "draftDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeagueQueuePost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueQueueMember" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeagueQueueMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeagueQueuePost_creatorId_idx" ON "LeagueQueuePost"("creatorId");
CREATE INDEX "LeagueQueuePost_status_createdAt_idx" ON "LeagueQueuePost"("status", "createdAt");
CREATE UNIQUE INDEX "LeagueQueueMember_postId_profileId_key" ON "LeagueQueueMember"("postId", "profileId");
CREATE INDEX "LeagueQueueMember_postId_idx" ON "LeagueQueueMember"("postId");
CREATE INDEX "LeagueQueueMember_profileId_idx" ON "LeagueQueueMember"("profileId");

ALTER TABLE "LeagueQueuePost" ADD CONSTRAINT "LeagueQueuePost_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeagueQueueMember" ADD CONSTRAINT "LeagueQueueMember_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "LeagueQueuePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeagueQueueMember" ADD CONSTRAINT "LeagueQueueMember_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
