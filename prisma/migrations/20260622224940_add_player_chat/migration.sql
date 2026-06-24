-- CreateTable
CREATE TABLE "PlayerChat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerChat_playerId_createdAt_idx" ON "PlayerChat"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerChat_authorId_idx" ON "PlayerChat"("authorId");

-- AddForeignKey
ALTER TABLE "PlayerChat" ADD CONSTRAINT "PlayerChat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SleeperPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerChat" ADD CONSTRAINT "PlayerChat_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
