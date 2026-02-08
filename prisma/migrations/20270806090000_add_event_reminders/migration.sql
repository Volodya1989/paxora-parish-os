CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventReminder_eventId_userId_startsAt_key" ON "EventReminder"("eventId", "userId", "startsAt");
CREATE INDEX "EventReminder_eventId_idx" ON "EventReminder"("eventId");
CREATE INDEX "EventReminder_userId_idx" ON "EventReminder"("userId");
CREATE INDEX "EventReminder_startsAt_idx" ON "EventReminder"("startsAt");

ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
