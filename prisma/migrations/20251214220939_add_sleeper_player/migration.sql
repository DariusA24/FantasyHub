-- CreateTable
CREATE TABLE "SleeperPlayer" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "position" TEXT,
    "team" TEXT,
    "rawJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleeperPlayer_pkey" PRIMARY KEY ("id")
);
