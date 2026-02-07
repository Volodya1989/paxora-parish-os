import { prisma } from "@/server/db/prisma";

export async function isSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPaxoraSuperAdmin: true }
  });

  return Boolean(user?.isPaxoraSuperAdmin);
}

export async function requireSuperAdmin(userId: string) {
  const allowed = await isSuperAdmin(userId);

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return true;
}
