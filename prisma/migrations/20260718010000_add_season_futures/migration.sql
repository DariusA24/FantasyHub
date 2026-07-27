-- CreateTable
CREATE TABLE "BetFuture" (
    "id" TEXT NOT NULL,
    "hubLeagueId" TEXT NOT NULL,
    "sleeperLeagueId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectRosterId" INTEGER,
    "subjectName" TEXT,
    "line" DOUBLE PRECISION,
    "closesWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "result" TEXT,
    "finalValue" DOUBLE PRECISION,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetFuture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetFutureOption" (
    "id" TEXT NOT NULL,
    "futureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rosterId" INTEGER,
    "pick" TEXT,
    "odds" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetFutureOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetFutureWager" (
    "id" TEXT NOT NULL,
    "futureId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "stake" INTEGER NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "payout" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "BetFutureWager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BetFuture_hubLeagueId_idx" ON "BetFuture"("hubLeagueId");

-- CreateIndex
CREATE INDEX "BetFuture_status_idx" ON "BetFuture"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BetFuture_hubLeagueId_season_kind_subjectRosterId_key" ON "BetFuture"("hubLeagueId", "season", "kind", "subjectRosterId");

-- CreateIndex
CREATE INDEX "BetFutureOption_futureId_idx" ON "BetFutureOption"("futureId");

-- CreateIndex
CREATE INDEX "BetFutureWager_futureId_idx" ON "BetFutureWager"("futureId");

-- CreateIndex
CREATE INDEX "BetFutureWager_profileId_idx" ON "BetFutureWager"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "BetFutureWager_optionId_profileId_key" ON "BetFutureWager"("optionId", "profileId");

-- AddForeignKey
ALTER TABLE "BetFuture" ADD CONSTRAINT "BetFuture_hubLeagueId_fkey" FOREIGN KEY ("hubLeagueId") REFERENCES "HubLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetFutureOption" ADD CONSTRAINT "BetFutureOption_futureId_fkey" FOREIGN KEY ("futureId") REFERENCES "BetFuture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetFutureWager" ADD CONSTRAINT "BetFutureWager_futureId_fkey" FOREIGN KEY ("futureId") REFERENCES "BetFuture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetFutureWager" ADD CONSTRAINT "BetFutureWager_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "BetFutureOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetFutureWager" ADD CONSTRAINT "BetFutureWager_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
