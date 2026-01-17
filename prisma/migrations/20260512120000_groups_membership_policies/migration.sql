-- Create enums for group visibility and join policy.
CREATE TYPE "GroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "GroupJoinPolicy" AS ENUM ('INVITE_ONLY', 'OPEN', 'REQUEST_TO_JOIN');

-- Add visibility and join policy to groups.
ALTER TABLE "Group"
ADD COLUMN "visibility" "GroupVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "joinPolicy" "GroupJoinPolicy" NOT NULL DEFAULT 'INVITE_ONLY';

-- Update group role enum values.
ALTER TYPE "GroupRole" RENAME VALUE 'LEAD' TO 'COORDINATOR';
ALTER TYPE "GroupRole" RENAME VALUE 'MEMBER' TO 'PARISHIONER';

-- Ensure default aligns with new role value.
ALTER TABLE "GroupMembership" ALTER COLUMN "role" SET DEFAULT 'PARISHIONER';

-- Add requested status for join requests.
ALTER TYPE "GroupMembershipStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';

-- Track approval actor.
ALTER TABLE "GroupMembership"
ADD COLUMN "approvedByUserId" TEXT;

ALTER TABLE "GroupMembership"
ADD CONSTRAINT "GroupMembership_approvedByUserId_fkey"
FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
