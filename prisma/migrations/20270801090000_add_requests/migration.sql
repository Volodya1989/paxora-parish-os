-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "VisibilityScope" AS ENUM ('CLERGY_ONLY', 'ADMIN_ALL', 'ADMIN_SPECIFIC');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('CONFESSION', 'LITURGICAL', 'PRAYER', 'TALK_TO_PRIEST');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'ADMIN_ALL',
    "title" TEXT NOT NULL,
    "details" JSONB,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Request_parishId_status_idx" ON "Request"("parishId", "status");

-- CreateIndex
CREATE INDEX "Request_parishId_createdByUserId_idx" ON "Request"("parishId", "createdByUserId");

-- CreateIndex
CREATE INDEX "Request_parishId_assignedToUserId_idx" ON "Request"("parishId", "assignedToUserId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
