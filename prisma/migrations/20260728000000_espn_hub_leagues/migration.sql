-- Allow ESPN-backed hub leagues alongside Sleeper ones.

-- HubLeague: track platform + public browsability
ALTER TABLE "HubLeague" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'sleeper';
ALTER TABLE "HubLeague" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- HubLeagueSeason: a season is Sleeper- OR ESPN-backed
ALTER TABLE "HubLeagueSeason" ALTER COLUMN "sleeperLeagueId" DROP NOT NULL;
ALTER TABLE "HubLeagueSeason" ADD COLUMN "espnLeagueId" TEXT;

CREATE INDEX "HubLeagueSeason_espnLeagueId_idx" ON "HubLeagueSeason"("espnLeagueId");
