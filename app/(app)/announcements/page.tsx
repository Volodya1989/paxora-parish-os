import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { listAnnouncements } from "@/lib/queries/announcements";
import AnnouncementsView from "@/components/announcements/AnnouncementsView";

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const [drafts, published] = await Promise.all([
    listAnnouncements({ parishId, status: "draft" }),
    listAnnouncements({ parishId, status: "published" })
  ]);

  return <AnnouncementsView parishId={parishId} drafts={drafts} published={published} />;
}
