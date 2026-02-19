import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import GroupMembersView from "@/components/groups/members/GroupMembersView";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembers, getPendingInvites } from "@/lib/queries/members";
import { listGroupInviteCandidates } from "@/lib/queries/groups";
import { requireCoordinatorOrAdmin } from "@/lib/authz/membership";
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

  const groupMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session.user.id,
      },
    },
    select: { status: true },
  });

  try {
    await requireCoordinatorOrAdmin(session.user.id, group.id);
  } catch {
    redirect(buildLocalePathname(locale, `/groups/${group.id}`));
  }

  if (
    group.status !== "ACTIVE" &&
    group.createdById !== session.user.id
  ) {
    notFound();
  }

  const [members, pendingInvites, inviteCandidates] = await Promise.all([
    getGroupMembers(group.id),
    getPendingInvites(group.id),
    listGroupInviteCandidates(group.parishId, session.user.id),
  ]);

  return (
    <ParishionerPageLayout
      pageTitle={t("groups.membersPage.headerTitle")}
      parishName={group.parish.name}
      parishLogoUrl={group.parish.logoUrl}
      subtitle={t("groups.membersPage.adminHint")}
      icon={<UsersIcon className="h-6 w-6 text-white" />}
      backHref={buildLocalePathname(locale, `/groups/${group.id}`)}
    >
      <GroupMembersView
        group={group}
        members={members}
        pendingInvites={pendingInvites}
        canManage
        inviteCandidates={inviteCandidates}
        viewer={{
          id: session.user.id,
          status: groupMembership?.status ?? null,
        }}
      />
    </ParishionerPageLayout>
  );
}
