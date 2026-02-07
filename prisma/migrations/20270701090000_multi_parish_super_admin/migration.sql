-- AlterTable
ALTER TABLE "Parish" ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPaxoraSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
