/*
  Warnings:

  - Added the required column `createdById` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "inProgressAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
