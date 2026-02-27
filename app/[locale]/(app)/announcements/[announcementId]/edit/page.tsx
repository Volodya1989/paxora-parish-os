import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { getAnnouncement } from "@/lib/queries/announcements";
import PageShell from "@/components/app/page-shell";
import Card from "@/components/ui/Card";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";

export default async function AnnouncementEditPage({
  params
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const membership = await getParishMembership(session.user.activeParishId, session.user.id);
  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  const { announcementId } = await params;
  const announcement = await getAnnouncement({
    parishId: session.user.activeParishId,
    userId: session.user.id,
    includeAll: true,
    announcementId
  });

  if (!announcement) {
    throw new Error("Not found");
  }

  return (
    <div className="section-gap">
      <PageShell
        title="Edit announcement"
        description="Update the message and publish status."
        summaryChips={[{ label: "Announcements", tone: "amber" }]}
      >
        <Card>
          <AnnouncementForm parishId={session.user.activeParishId} announcement={announcement} />
        </Card>
      </PageShell>
    </div>
  );
}
