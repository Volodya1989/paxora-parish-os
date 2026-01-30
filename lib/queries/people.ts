import type { ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type ParishMemberRecord = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: ParishRole;
};

export async function getPeopleList(parishId: string): Promise<ParishMemberRecord[]> {
  const memberships = await prisma.membership.findMany({
    where: { parishId },
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role
  }));
}
