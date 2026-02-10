import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { listAnnouncements } from "@/lib/queries/announcements";
import AnnouncementsView from "@/components/announcements/AnnouncementsView";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const [membership, parish] = await Promise.all([
    getParishMembership(parishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const canManage = isParishLeader(membership.role);
  const [drafts, published] = await Promise.all([
    canManage ? listAnnouncements({ parishId, status: "draft" }) : Promise.resolve([]),
    listAnnouncements({ parishId, status: "published" })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="Announcements"
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={canManage}
      subtitle="Stay informed with the latest parish news"
      gradientClass="from-amber-500 via-amber-400 to-orange-400"
    >
      <AnnouncementsView drafts={drafts} published={published} canManage={canManage} />
    </ParishionerPageLayout>
  );
}
