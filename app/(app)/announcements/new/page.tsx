import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

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
    <div className="space-y-6">
      <SectionTitle title="Create announcement" subtitle="Share parish updates" />
      <Card>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-900">Coming soon</h2>
          <p className="text-sm text-ink-500">
            Announcement creation is on the way. For now, keep updates in your weekly digest.
          </p>
          <Link href="/digest">
            <Button size="sm" variant="secondary">
              Go to digest
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
