-- CreateEnum
CREATE TYPE "ParishHubTargetType" AS ENUM ('EXTERNAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ParishHubVisibility" AS ENUM ('PUBLIC', 'LOGGED_IN');

-- CreateEnum
CREATE TYPE "ParishIcon" AS ENUM (
  'BULLETIN',
  'MASS_TIMES',
  'CONFESSION',
  'WEBSITE',
  'CALENDAR',
  'READINGS',
  'GIVING',
  'CONTACT'
);

-- AlterTable
ALTER TABLE "Parish" ADD COLUMN "hubGridEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Parish" ADD COLUMN "hubGridPublicEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ParishHubItem" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" "ParishIcon" NOT NULL,
    "targetType" "ParishHubTargetType" NOT NULL,
    "targetUrl" TEXT,
    "internalRoute" TEXT,
    "visibility" "ParishHubVisibility" NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParishHubItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParishHubItem_parishId_order_key" ON "ParishHubItem"("parishId", "order");

-- CreateIndex
CREATE INDEX "ParishHubItem_parishId_idx" ON "ParishHubItem"("parishId");

-- CreateIndex
CREATE INDEX "ParishHubItem_parishId_enabled_idx" ON "ParishHubItem"("parishId", "enabled");

-- AddForeignKey
ALTER TABLE "ParishHubItem" ADD CONSTRAINT "ParishHubItem_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
