-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
