-- Replace per-team bios with per-franchise (owner) bios
DROP TABLE IF EXISTS "EspnTeamBio";

CREATE TABLE "EspnFranchiseBio" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EspnFranchiseBio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EspnFranchiseBio_leagueId_idx" ON "EspnFranchiseBio"("leagueId");
CREATE UNIQUE INDEX "EspnFranchiseBio_leagueId_memberId_key" ON "EspnFranchiseBio"("leagueId", "memberId");
