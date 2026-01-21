ALTER TABLE "Task"
ADD COLUMN "volunteersNeeded" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Task"
ALTER COLUMN "ownerId" DROP NOT NULL;

CREATE TABLE "TaskVolunteer" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskVolunteer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskVolunteer_taskId_userId_key" ON "TaskVolunteer"("taskId", "userId");
CREATE INDEX "TaskVolunteer_taskId_idx" ON "TaskVolunteer"("taskId");
CREATE INDEX "TaskVolunteer_userId_idx" ON "TaskVolunteer"("userId");

CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");
CREATE INDEX "TaskComment_authorId_idx" ON "TaskComment"("authorId");

CREATE INDEX "TaskActivity_taskId_idx" ON "TaskActivity"("taskId");
CREATE INDEX "TaskActivity_actorId_idx" ON "TaskActivity"("actorId");

ALTER TABLE "TaskVolunteer" ADD CONSTRAINT "TaskVolunteer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskVolunteer" ADD CONSTRAINT "TaskVolunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
