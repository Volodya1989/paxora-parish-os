import { getServerSession } from "next-auth";
import GroupsView from "@/components/groups/GroupsView";
import { authOptions } from "@/server/auth/options";
import { listGroupInviteCandidates, listGroups } from "@/lib/queries/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { UsersIcon } from "@/components/icons/ParishIcons";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
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

  const [groups, inviteCandidates, contactHubItem] = await Promise.all([
    listGroups(parishId, actorUserId, membership.role, true),
    listGroupInviteCandidates(parishId, actorUserId),
    prisma.parishHubItem.findFirst({
      where: {
        parishId,
        icon: "CONTACT",
        enabled: true,
        OR: [
          { targetUrl: { not: null } },
          { internalRoute: { not: null } }
        ]
      },
      orderBy: { order: "asc" },
      select: {
        targetUrl: true,
        internalRoute: true
      }
    })
  ]);
  const isLeader = isParishLeader(membership.role);
  const contactParishHref = contactHubItem?.targetUrl ?? (contactHubItem?.internalRoute
    ? buildLocalePathname(locale, contactHubItem.internalRoute)
    : null);

  return (
    <ParishionerPageLayout
      pageTitle={t("nav.community")}
      parishName={parish?.name ?? t("groups.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("groups.subtitle")}
      sectionTheme="Community"
      icon={<UsersIcon className="h-6 w-6 text-white" />}
    >
      <GroupsView
        groups={groups}
        parishId={parishId}
        actorUserId={actorUserId}
        inviteCandidates={inviteCandidates}
        canManageGroups={isLeader}
        canRequestContentCreate={membership.role === "MEMBER"}
        contactParishHref={contactParishHref}
      />
    </ParishionerPageLayout>
  );
}
