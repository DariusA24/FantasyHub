-- AlterTable
ALTER TABLE "HubLeagueChampion" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "variant" TEXT NOT NULL DEFAULT 'classic';
