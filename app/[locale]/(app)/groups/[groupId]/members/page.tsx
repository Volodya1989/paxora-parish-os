import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import GroupMembersView from "@/components/groups/members/GroupMembersView";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembers, getPendingInvites } from "@/lib/queries/members";
import { listGroupInviteCandidates } from "@/lib/queries/groups";
import { isAdminClergy } from "@/lib/authz/membership";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";
import { UsersIcon } from "@/components/icons/ParishIcons";

type GroupMembersPageProps = {
  params: Promise<{
    locale: string;
    groupId: string;
  }>;
};

export default async function GroupMembersPage({
  params,
}: GroupMembersPageProps) {
  const { locale: localeParam, groupId } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId: session.user.activeParishId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      parishId: true,
      visibility: true,
      joinPolicy: true,
      status: true,
      createdById: true,
      parish: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const [parishMembership, groupMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: group.parishId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    }),
    prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: session.user.id,
        },
      },
      select: { role: true, status: true },
    }),
  ]);

  const isLeader = parishMembership
    ? isAdminClergy(parishMembership.role)
    : false;
  const isCoordinator =
    groupMembership?.status === "ACTIVE" &&
    groupMembership.role === "COORDINATOR";
  const canManage = isLeader || isCoordinator;
  const canViewPending = canManage || groupMembership?.status === "ACTIVE";
  const canView =
    isLeader ||
    groupMembership?.status === "ACTIVE" ||
    groupMembership?.status === "INVITED" ||
    groupMembership?.status === "REQUESTED";

  if (
    !canView ||
    (group.status !== "ACTIVE" &&
      !isLeader &&
      group.createdById !== session.user.id)
  ) {
    notFound();
  }

  const [members, pendingInvites, inviteCandidates] = await Promise.all([
    getGroupMembers(group.id),
    canViewPending ? getPendingInvites(group.id) : Promise.resolve([]),
    listGroupInviteCandidates(group.parishId, session.user.id),
  ]);

  return (
    <ParishionerPageLayout
      pageTitle={t("groups.membersPage.headerTitle")}
      parishName={group.parish.name}
      parishLogoUrl={group.parish.logoUrl}
      subtitle={group.name}
      icon={<UsersIcon className="h-6 w-6 text-white" />}
      backHref={buildLocalePathname(locale, `/groups/${group.id}`)}
    >
      <GroupMembersView
        group={group}
        members={members}
        pendingInvites={pendingInvites}
        canManage={canManage}
        inviteCandidates={inviteCandidates}
        viewer={{
          id: session.user.id,
          status: groupMembership?.status ?? null,
        }}
      />
    </ParishionerPageLayout>
  );
}
