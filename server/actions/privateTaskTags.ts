export function normalizeUserTagName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

type PrivateTaskRecord = {
  id: string;
  parishId: string;
  visibility: string;
  ownerId: string | null;
  createdById: string;
};

type PrismaLike = {
  task: {
    findUnique: (args: any) => Promise<PrivateTaskRecord | null>;
  };
  userTag: {
    findMany: (args: any) => Promise<Array<{ id: string }>>;
  };
  $transaction: (fn: (tx: { taskUserTag: { deleteMany: (args: any) => Promise<unknown>; createMany: (args: any) => Promise<unknown> } }) => Promise<void>) => Promise<void>;
};

async function assertPrivateTaskOwner({ prisma, taskId, parishId, userId }: { prisma: PrismaLike; taskId: string; parishId: string; userId: string }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, parishId: true, visibility: true, ownerId: true, createdById: true }
  });

  if (!task || task.parishId !== parishId) throw new Error("Task not found");
  if (task.visibility !== "PRIVATE") throw new Error("Only private tasks support personal tags.");
  if (task.ownerId !== userId) throw new Error("Forbidden");
}

export async function updatePrivateTaskTagsForUser({
  prisma,
  taskId,
  parishId,
  userId,
  addTagIds,
  removeTagIds
}: {
  prisma: PrismaLike;
  taskId: string;
  parishId: string;
  userId: string;
  addTagIds?: string[];
  removeTagIds?: string[];
}) {
  await assertPrivateTaskOwner({ prisma, taskId, parishId, userId });

  const addIds = Array.from(new Set((addTagIds ?? []).filter(Boolean)));
  const removeIds = Array.from(new Set((removeTagIds ?? []).filter(Boolean)));
  const candidateIds = Array.from(new Set([...addIds, ...removeIds]));

  if (candidateIds.length > 0) {
    const ownedTags = await prisma.userTag.findMany({
      where: { id: { in: candidateIds }, userId },
      select: { id: true }
    });

    if (ownedTags.length !== candidateIds.length) {
      throw new Error("Invalid tag selection.");
    }
  }

  await prisma.$transaction(async (tx) => {
    if (removeIds.length > 0) {
      await tx.taskUserTag.deleteMany({ where: { taskId, userTagId: { in: removeIds } } });
    }

    if (addIds.length > 0) {
      await tx.taskUserTag.createMany({
        data: addIds.map((userTagId) => ({ taskId, userTagId })),
        skipDuplicates: true
      });
    }
  });
}
