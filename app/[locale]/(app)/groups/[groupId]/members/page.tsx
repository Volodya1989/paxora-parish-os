import { getServerSession } from "next-auth";
import GroupMembersView from "@/components/groups/members/GroupMembersView";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembers, getPendingInvites } from "@/lib/queries/members";
import { listGroupInviteCandidates } from "@/lib/queries/groups";
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
      parishId: true,
      visibility: true,
      joinPolicy: true,
      status: true,
      createdById: true
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
  const isCoordinator =
    groupMembership?.status === "ACTIVE" && groupMembership.role === "COORDINATOR";
  const canManage = isLeader || isCoordinator;
  const canViewPending = canManage || groupMembership?.status === "ACTIVE";
  const canView =
    isLeader ||
    groupMembership?.status === "ACTIVE" ||
    groupMembership?.status === "INVITED" ||
    groupMembership?.status === "REQUESTED";

  if (!canView || (group.status !== "ACTIVE" && !isLeader && group.createdById !== session.user.id)) {
    throw new Error("Unauthorized");
  }

  const [members, pendingInvites, inviteCandidates] = await Promise.all([
    getGroupMembers(group.id),
    canViewPending ? getPendingInvites(group.id) : Promise.resolve([]),
    listGroupInviteCandidates(group.parishId, session.user.id)
  ]);

  return (
    <GroupMembersView
      group={group}
      members={members}
      pendingInvites={pendingInvites}
      canManage={canManage}
      inviteCandidates={inviteCandidates}
      viewer={{
        id: session.user.id,
        status: groupMembership?.status ?? null
      }}
    />
  );
}
