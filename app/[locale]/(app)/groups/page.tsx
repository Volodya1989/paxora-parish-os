import { getServerSession } from "next-auth";
import GroupsView from "@/components/groups/GroupsView";
import { authOptions } from "@/server/auth/options";
import { listGroups } from "@/lib/queries/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const parishId = session.user.activeParishId;
  const actorUserId = session.user.id;

  const [membership, parish] = await Promise.all([
    getParishMembership(parishId, actorUserId),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true }
    })
  ]);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const groups = await listGroups(parishId, actorUserId, membership.role, true);
  const isLeader = isParishLeader(membership.role);

  return (
    <ParishionerPageLayout
      pageTitle="Groups"
      parishName={parish?.name ?? "My Parish"}
      isLeader={isLeader}
      subtitle="Find your people and grow together"
      quote="For where two or three gather in my name, there am I with them."
      quoteSource="Matthew 18:20"
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
    >
      <GroupsView
        groups={groups}
        parishId={parishId}
        actorUserId={actorUserId}
        canManageGroups={isLeader}
      />
    </ParishionerPageLayout>
  );
}
