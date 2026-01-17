CREATE TYPE "GroupMembershipStatus" AS ENUM ('INVITED', 'ACTIVE');

CREATE TYPE "EventRecurrenceFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

ALTER TABLE "GroupMembership" ADD COLUMN "status" "GroupMembershipStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "GroupMembership" ADD COLUMN "invitedByUserId" TEXT;
ALTER TABLE "GroupMembership" ADD COLUMN "invitedEmail" TEXT;
ALTER TABLE "GroupMembership" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GroupMembership" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN "recurrenceFreq" "EventRecurrenceFrequency" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Event" ADD COLUMN "recurrenceInterval" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "recurrenceByWeekday" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Event" ADD COLUMN "recurrenceUntil" TIMESTAMP(3);
