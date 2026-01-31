import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { listParishHubItemsForMember, ensureParishHubDefaults } from "@/server/actions/parish-hub";
import { prisma } from "@/server/db/prisma";
import ParishHubGrid from "@/components/parish-hub/ParishHubGrid";
import ParishHubEmptyState from "@/components/parish-hub/ParishHubEmptyState";
import type { ParishHubItemData } from "@/components/parish-hub/ParishHubTile";
import PageHeader from "@/components/header/PageHeader";

export default async function ParishHubPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  // Ensure default hub items exist for new parishes
  await ensureParishHubDefaults();

  const [items, membership, parish] = await Promise.all([
    listParishHubItemsForMember(),
    getParishMembership(session.user.activeParishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true }
    })
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
      {/* Consistent page header */}
      <PageHeader
        pageTitle="Parish Hub"
        parishName={parish?.name ?? "My Parish"}
        subtitle="Quick links to parish resources and information"
        actions={
          isAdmin ? (
            <Link
              href="/profile"
              className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30"
            >
              Manage
            </Link>
          ) : undefined
        }
      />

      {/* Parish Hub Grid */}
      {hubItems.length > 0 ? (
        <ParishHubGrid items={hubItems} />
      ) : (
        <ParishHubEmptyState isAdmin={isAdmin} />
      )}
    </div>
  );
}
