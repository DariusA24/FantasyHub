-- CreateTable
CREATE TABLE "HubLeaguePostLike" (
    "id" SERIAL NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeaguePostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubLeaguePostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeaguePostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeaguePostLike_postId_idx" ON "HubLeaguePostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeaguePostLike_postId_profileId_key" ON "HubLeaguePostLike"("postId", "profileId");

-- CreateIndex
CREATE INDEX "HubLeaguePostComment_postId_idx" ON "HubLeaguePostComment"("postId");

-- CreateIndex
CREATE INDEX "HubLeaguePostComment_authorId_idx" ON "HubLeaguePostComment"("authorId");

-- AddForeignKey
ALTER TABLE "HubLeaguePostLike" ADD CONSTRAINT "HubLeaguePostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubLeaguePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeaguePostLike" ADD CONSTRAINT "HubLeaguePostLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeaguePostComment" ADD CONSTRAINT "HubLeaguePostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubLeaguePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeaguePostComment" ADD CONSTRAINT "HubLeaguePostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
