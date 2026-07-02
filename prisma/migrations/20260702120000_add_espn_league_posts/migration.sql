-- Allow blog posts to belong to an ESPN league instead of a hub league
ALTER TABLE "HubLeaguePost" ALTER COLUMN "hubLeagueId" DROP NOT NULL;

ALTER TABLE "HubLeaguePost" ADD COLUMN IF NOT EXISTS "espnLeagueId" TEXT;

CREATE INDEX IF NOT EXISTS "HubLeaguePost_espnLeagueId_idx" ON "HubLeaguePost"("espnLeagueId");
