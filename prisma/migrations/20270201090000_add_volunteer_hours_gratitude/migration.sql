CREATE TYPE "HeroNominationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "HoursEntrySource" AS ENUM ('ESTIMATED', 'MANUAL');

ALTER TABLE "Parish"
  ADD COLUMN "gratitudeSpotlightEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gratitudeSpotlightLimit" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "bronzeHours" DOUBLE PRECISION NOT NULL DEFAULT 10,
  ADD COLUMN "silverHours" DOUBLE PRECISION NOT NULL DEFAULT 25,
  ADD COLUMN "goldHours" DOUBLE PRECISION NOT NULL DEFAULT 50;

ALTER TABLE "User"
  ADD COLUMN "volunteerHoursOptIn" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "HoursEntry" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "groupId" TEXT,
  "estimatedHours" DOUBLE PRECISION,
  "hours" DOUBLE PRECISION NOT NULL,
  "source" "HoursEntrySource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HoursEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeroNomination" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "nominatorId" TEXT NOT NULL,
  "nomineeUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "HeroNominationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),

  CONSTRAINT "HeroNomination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HoursEntry_taskId_userId_key" ON "HoursEntry"("taskId", "userId");
CREATE INDEX "HoursEntry_parishId_weekId_idx" ON "HoursEntry"("parishId", "weekId");
CREATE INDEX "HoursEntry_parishId_createdAt_idx" ON "HoursEntry"("parishId", "createdAt");
CREATE INDEX "HoursEntry_userId_idx" ON "HoursEntry"("userId");

CREATE UNIQUE INDEX "HeroNomination_parishId_weekId_nomineeUserId_key" ON "HeroNomination"("parishId", "weekId", "nomineeUserId");
CREATE INDEX "HeroNomination_parishId_weekId_status_idx" ON "HeroNomination"("parishId", "weekId", "status");

ALTER TABLE "HoursEntry"
  ADD CONSTRAINT "HoursEntry_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HoursEntry"
  ADD CONSTRAINT "HoursEntry_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HoursEntry"
  ADD CONSTRAINT "HoursEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HoursEntry"
  ADD CONSTRAINT "HoursEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HoursEntry"
  ADD CONSTRAINT "HoursEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeroNomination"
  ADD CONSTRAINT "HeroNomination_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HeroNomination"
  ADD CONSTRAINT "HeroNomination_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HeroNomination"
  ADD CONSTRAINT "HeroNomination_nominatorId_fkey" FOREIGN KEY ("nominatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HeroNomination"
  ADD CONSTRAINT "HeroNomination_nomineeUserId_fkey" FOREIGN KEY ("nomineeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
