-- CreateTable
CREATE TABLE "HubLeagueMember" (
    "id" SERIAL NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubLeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubLeagueMember_profileId_idx" ON "HubLeagueMember"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HubLeagueMember_hubLeagueId_profileId_key" ON "HubLeagueMember"("hubLeagueId", "profileId");

-- AddForeignKey
ALTER TABLE "HubLeagueMember" ADD CONSTRAINT "HubLeagueMember_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubLeagueMember" ADD CONSTRAINT "HubLeagueMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
