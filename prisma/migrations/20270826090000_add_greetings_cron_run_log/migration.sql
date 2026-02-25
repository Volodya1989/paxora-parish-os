-- CreateEnum
CREATE TYPE "CronRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "EmailLog"
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "providerError" TEXT;

-- CreateTable
CREATE TABLE "GreetingCronRunLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "CronRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "plannedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "missingEnv" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreetingCronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GreetingCronRunLog_requestId_key" ON "GreetingCronRunLog"("requestId");

-- CreateIndex
CREATE INDEX "GreetingCronRunLog_createdAt_idx" ON "GreetingCronRunLog"("createdAt");

-- CreateIndex
CREATE INDEX "GreetingCronRunLog_status_createdAt_idx" ON "GreetingCronRunLog"("status", "createdAt");
