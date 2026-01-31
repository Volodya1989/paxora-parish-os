import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { listParishHubItemsForMember, ensureParishHubDefaults } from "@/server/actions/parish-hub";
import SectionTitle from "@/components/ui/SectionTitle";
import ParishHubGrid from "@/components/parish-hub/ParishHubGrid";
import ParishHubEmptyState from "@/components/parish-hub/ParishHubEmptyState";
import type { ParishHubItemData } from "@/components/parish-hub/ParishHubTile";

export default async function ParishHubPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  // Ensure default hub items exist for new parishes
  await ensureParishHubDefaults();

  const [items, membership] = await Promise.all([
    listParishHubItemsForMember(),
    getParishMembership(session.user.activeParishId, session.user.id)
  ]);

  const isAdmin = membership ? isParishLeader(membership.role) : false;

  // Transform items to match ParishHubItemData type
  const hubItems: ParishHubItemData[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon as ParishHubItemData["icon"],
    targetType: item.targetType as "EXTERNAL" | "INTERNAL",
    targetUrl: item.targetUrl,
    internalRoute: item.internalRoute
  }));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Parish Hub"
        subtitle="Quick links to parish resources and information"
      />

      {hubItems.length > 0 ? (
        <ParishHubGrid items={hubItems} />
      ) : (
        <ParishHubEmptyState isAdmin={isAdmin} />
      )}
    </div>
  );
}
