-- CreateTable
CREATE TABLE "HubLeaguePost" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "readTime" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubLeaguePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeaguePost_hubLeagueId_idx" ON "HubLeaguePost"("hubLeagueId");

-- CreateIndex
CREATE INDEX "HubLeaguePost_authorId_idx" ON "HubLeaguePost"("authorId");

-- AddForeignKey
ALTER TABLE "HubLeaguePost" ADD CONSTRAINT "HubLeaguePost_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeaguePost" ADD CONSTRAINT "HubLeaguePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
