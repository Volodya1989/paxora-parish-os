-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastSeenAnnouncementsAt" TIMESTAMP(3),
ADD COLUMN "lastSeenEventsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_parishId_idx" ON "PushSubscription"("userId", "parishId");

-- CreateIndex
CREATE INDEX "PushSubscription_parishId_idx" ON "PushSubscription"("parishId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
