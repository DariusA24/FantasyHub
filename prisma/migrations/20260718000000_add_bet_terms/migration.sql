-- AlterTable: support non-currency "terms" H2H bets
ALTER TABLE "Bet" ADD COLUMN "stakeType" TEXT NOT NULL DEFAULT 'coins';
ALTER TABLE "Bet" ADD COLUMN "terms" TEXT;
ALTER TABLE "Bet" ALTER COLUMN "amount" SET DEFAULT 0;
