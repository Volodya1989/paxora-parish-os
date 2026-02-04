-- CreateEnum
CREATE TYPE "EventRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventRequestCategory" AS ENUM ('SERVICE', 'REHEARSAL', 'GATHERING', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ParishIcon" ADD VALUE 'FACEBOOK';
ALTER TYPE "ParishIcon" ADD VALUE 'YOUTUBE';
ALTER TYPE "ParishIcon" ADD VALUE 'PRAYER';
ALTER TYPE "ParishIcon" ADD VALUE 'NEWS';

-- CreateTable
CREATE TABLE "EventRequest" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EventRequestCategory" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "participants" INTEGER,
    "status" "EventRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "eventId" TEXT,

    CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRequest_eventId_key" ON "EventRequest"("eventId");

-- CreateIndex
CREATE INDEX "EventRequest_parishId_status_idx" ON "EventRequest"("parishId", "status");

-- CreateIndex
CREATE INDEX "EventRequest_requesterId_idx" ON "EventRequest"("requesterId");

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
