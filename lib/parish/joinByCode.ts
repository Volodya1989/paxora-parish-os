import { prisma } from "@/server/db/prisma";
import { normalizeParishInviteCode } from "@/lib/parish/inviteCode";

export type JoinByCodeResult =
  | { status: "joined"; parishId: string }
  | { status: "already_member"; parishId: string }
  | { status: "invalid_code" };

export async function joinParishByCode(userId: string, codeInput: string): Promise<JoinByCodeResult> {
  const code = normalizeParishInviteCode(codeInput);

  if (!code) {
    return { status: "invalid_code" };
  }

  const parish = await prisma.parish.findUnique({
    where: { inviteCode: code },
    select: { id: true }
  });

  if (!parish) {
    return { status: "invalid_code" };
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: parish.id,
        userId
      }
    },
    select: { id: true }
  });

  if (existingMembership) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeParishId: parish.id }
    });

    return { status: "already_member", parishId: parish.id };
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        parishId: parish.id,
        userId,
        role: "MEMBER"
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { activeParishId: parish.id }
    })
  ]);

  return { status: "joined", parishId: parish.id };
}
