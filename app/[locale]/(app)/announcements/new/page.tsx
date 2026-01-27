import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import PageShell from "@/components/app/page-shell";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";

export default async function AnnouncementCreatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const membership = await getParishMembership(session.user.activeParishId, session.user.id);
  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  return (
    <div className="section-gap">
      <PageShell
        title="New announcement"
        description="Share a short update with the parish."
        summaryChips={[{ label: "Announcements", tone: "amber" }]}
      >
        <Card>
          <AnnouncementForm parishId={session.user.activeParishId} />
        </Card>
      </PageShell>
    </div>
  );
}
