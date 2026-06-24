-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "readTime" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPostLike" (
    "id" SERIAL NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");

-- CreateIndex
CREATE INDEX "ForumPost_publishedAt_idx" ON "ForumPost"("publishedAt");

-- CreateIndex
CREATE INDEX "ForumPost_tag_idx" ON "ForumPost"("tag");

-- CreateIndex
CREATE INDEX "ForumPostLike_postId_idx" ON "ForumPostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPostLike_postId_profileId_key" ON "ForumPostLike"("postId", "profileId");

-- CreateIndex
CREATE INDEX "ForumPostComment_postId_idx" ON "ForumPostComment"("postId");

-- CreateIndex
CREATE INDEX "ForumPostComment_authorId_idx" ON "ForumPostComment"("authorId");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLike" ADD CONSTRAINT "ForumPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLike" ADD CONSTRAINT "ForumPostLike_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostComment" ADD CONSTRAINT "ForumPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostComment" ADD CONSTRAINT "ForumPostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
