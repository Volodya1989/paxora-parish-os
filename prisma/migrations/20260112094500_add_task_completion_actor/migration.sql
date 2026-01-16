-- Add completed by attribution to tasks
ALTER TABLE "Task" ADD COLUMN "completedById" TEXT;

-- Add foreign key for completedBy
ALTER TABLE "Task"
ADD CONSTRAINT "Task_completedById_fkey"
FOREIGN KEY ("completedById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Optional index for completedBy lookups
CREATE INDEX "Task_completedById_idx" ON "Task"("completedById");
