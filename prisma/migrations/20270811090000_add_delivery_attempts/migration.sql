-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "parishId" TEXT,
    "userId" TEXT,
    "target" TEXT,
    "template" TEXT,
    "context" JSONB,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryAttempt_parishId_createdAt_idx" ON "DeliveryAttempt"("parishId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_channel_status_createdAt_idx" ON "DeliveryAttempt"("channel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_userId_createdAt_idx" ON "DeliveryAttempt"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
