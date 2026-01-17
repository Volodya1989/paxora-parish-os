-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'GROUP', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SERVICE', 'EVENT');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "Event_parishId_visibility_idx" ON "Event"("parishId", "visibility");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
