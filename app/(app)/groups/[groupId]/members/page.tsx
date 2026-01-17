import { getServerSession } from "next-auth";
import GroupMembersView from "@/components/groups/members/GroupMembersView";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembers, getPendingInvites } from "@/lib/queries/members";
import { isAdminClergy } from "@/lib/authz/membership";

type GroupMembersPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupMembersPage({ params }: GroupMembersPageProps) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId: session.user.activeParishId
    },
    select: {
      id: true,
      name: true,
      description: true,
      parishId: true
    }
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const [parishMembership, groupMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: group.parishId,
          userId: session.user.id
        }
      },
      select: { role: true }
    }),
    prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: session.user.id
        }
      },
      select: { role: true, status: true }
    })
  ]);

  const isLeader = parishMembership ? isAdminClergy(parishMembership.role) : false;
  const isCoordinator = groupMembership?.status === "ACTIVE" && groupMembership.role === "LEAD";
  const canManage = isLeader || isCoordinator;
  const canView =
    isLeader || groupMembership?.status === "ACTIVE" || groupMembership?.status === "INVITED";

  if (!canView) {
    throw new Error("Unauthorized");
  }

  const [members, pendingInvites] = await Promise.all([
    getGroupMembers(group.id),
    canManage ? getPendingInvites(group.id) : Promise.resolve([])
  ]);

  return (
    <GroupMembersView
      group={group}
      members={members}
      pendingInvites={pendingInvites}
      canManage={canManage}
      viewer={{
        id: session.user.id,
        status: groupMembership?.status ?? null
      }}
    />
  );
}
