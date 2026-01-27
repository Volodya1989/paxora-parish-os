import { getServerSession } from "next-auth";
import GroupsView from "@/components/groups/GroupsView";
import { authOptions } from "@/server/auth/options";
import { listGroups } from "@/lib/queries/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const parishId = session.user.activeParishId;
  const actorUserId = session.user.id;

  const membership = await getParishMembership(parishId, actorUserId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const groups = await listGroups(parishId, actorUserId, membership.role, true);

  return (
    <GroupsView
      groups={groups}
      parishId={parishId}
      actorUserId={actorUserId}
      canManageGroups={isParishLeader(membership.role)}
    />
  );
}
