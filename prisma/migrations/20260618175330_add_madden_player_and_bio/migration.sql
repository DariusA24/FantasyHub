-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "bio" TEXT;

-- CreateTable
CREATE TABLE "maddenPlayer" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "position" TEXT,
    "team" TEXT,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "overall" INTEGER,
    "shared_stats" JSONB DEFAULT '{}',
    "qb_stats" JSONB DEFAULT '{}',
    "wr_stats" JSONB DEFAULT '{}',
    "te_stats" JSONB DEFAULT '{}',
    "rb_stats" JSONB DEFAULT '{}',
    "k_stats" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT "maddenPlayer_pkey" PRIMARY KEY ("id","year","week")
);

-- CreateIndex
CREATE INDEX "maddenPlayer_id_idx" ON "maddenPlayer"("id");

-- AddForeignKey
ALTER TABLE "maddenPlayer" ADD CONSTRAINT "maddenPlayer_id_fkey" FOREIGN KEY ("id") REFERENCES "SleeperPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
