-- CreateTable
CREATE TABLE "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskUserTag" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUserTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTag_userId_idx" ON "UserTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTag_userId_name_key" ON "UserTag"("userId", "name");

-- CreateIndex (case-insensitive uniqueness)
CREATE UNIQUE INDEX "UserTag_userId_name_lower_key" ON "UserTag"("userId", LOWER("name"));

-- CreateIndex
CREATE INDEX "TaskUserTag_taskId_idx" ON "TaskUserTag"("taskId");

-- CreateIndex
CREATE INDEX "TaskUserTag_userTagId_idx" ON "TaskUserTag"("userTagId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskUserTag_taskId_userTagId_key" ON "TaskUserTag"("taskId", "userTagId");

-- AddForeignKey
ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUserTag" ADD CONSTRAINT "TaskUserTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUserTag" ADD CONSTRAINT "TaskUserTag_userTagId_fkey" FOREIGN KEY ("userTagId") REFERENCES "UserTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
