import { getServerSession } from "next-auth";
import GroupsView from "@/components/groups/GroupsView";
import { authOptions } from "@/server/auth/options";
import { listGroups } from "@/lib/queries/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { UsersIcon } from "@/components/icons/ParishIcons";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

export default async function GroupsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);

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
      select: { name: true, logoUrl: true }
    })
  ]);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const groups = await listGroups(parishId, actorUserId, membership.role, true);
  const isLeader = isParishLeader(membership.role);
  const joinedGroups = groups
    .filter((group) => group.viewerMembershipStatus === "ACTIVE")
    .map((group) => ({ id: group.id, name: group.name }));

  return (
    <ParishionerPageLayout
      pageTitle={t("nav.groups")}
      parishName={parish?.name ?? t("groups.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("groups.subtitle")}
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      icon={<UsersIcon className="h-6 w-6 text-white" />}
    >
      <GroupsView
        groups={groups}
        parishId={parishId}
        actorUserId={actorUserId}
        canManageGroups={isLeader}
        canRequestParishSupport={membership.role === "MEMBER"}
        requesterEmail={session.user.email ?? ""}
        requestGroupOptions={joinedGroups}
      />
    </ParishionerPageLayout>
  );
}
