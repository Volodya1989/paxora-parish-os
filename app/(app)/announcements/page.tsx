import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { listAnnouncements } from "@/lib/queries/announcements";
import AnnouncementsView from "@/components/announcements/AnnouncementsView";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const membership = await getParishMembership(parishId, session.user.id);
  if (!membership) {
    throw new Error("Unauthorized");
  }
  const canManage = isParishLeader(membership.role);
  const [drafts, published] = await Promise.all([
    canManage ? listAnnouncements({ parishId, status: "draft" }) : Promise.resolve([]),
    listAnnouncements({ parishId, status: "published" })
  ]);

  return (
    <AnnouncementsView drafts={drafts} published={published} canManage={canManage} />
  );
}
