-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "clerkId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profileImage" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sleeperProfileId" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleeperProfile" (
    "id" SERIAL NOT NULL,
    "sleeperId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" INTEGER NOT NULL,

    CONSTRAINT "sleeperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_clerkId_key" ON "Profile"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "sleeperProfile_sleeperId_key" ON "sleeperProfile"("sleeperId");

-- CreateIndex
CREATE UNIQUE INDEX "sleeperProfile_profileId_key" ON "sleeperProfile"("profileId");

-- AddForeignKey
ALTER TABLE "sleeperProfile" ADD CONSTRAINT "sleeperProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
