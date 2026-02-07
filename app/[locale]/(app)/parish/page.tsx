import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { listParishHubItemsForMember, ensureParishHubDefaults } from "@/server/actions/parish-hub";
import { prisma } from "@/server/db/prisma";
import ParishHubGrid from "@/components/parish-hub/ParishHubGrid";
import ParishHubEmptyState from "@/components/parish-hub/ParishHubEmptyState";
import FeaturedPanel from "@/components/parish-hub/FeaturedPanel";
import type { FeaturedPanelConfig } from "@/components/parish-hub/FeaturedPanel";
import type { ParishHubItemData } from "@/components/parish-hub/ParishHubTile";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { cn } from "@/lib/ui/cn";

/* ── Static featured-panel configuration ─────────────────────────── */
const featuredConfig: FeaturedPanelConfig = {
  title: "This Week's Bulletin Is Ready",
  meta: "Featured",
  description:
    "Stay informed with parish updates, Mass intentions, and upcoming events. Read the latest bulletin to see what's happening this week.",
  ctaLabel: "Read Bulletin",
  ctaHref: "/parish/bulletin",
  ctaExternal: false,
};

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

  const isLeader = membership ? isParishLeader(membership.role) : false;

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
    <ParishionerPageLayout
      pageTitle="Parish Hub"
      parishName={parish?.name ?? "My Parish"}
      isLeader={isLeader}
      subtitle="Quick links to parish resources and information"
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      actions={
        <Link
          href="/requests/new"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-button border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 focus-ring"
          )}
        >
          Make a Request
        </Link>
      }
    >
      {/* Quick-action panel: Make a Request */}
      <div className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50/60 to-white px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-800">Need something from the parish?</p>
          <p className="text-xs text-ink-500">Confession, blessing, meeting, or prayer</p>
        </div>
        <Link
          href="/requests/new"
          className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Request
        </Link>
      </div>

      {/* Parish Hub Grid */}
      {hubItems.length > 0 ? (
        <ParishHubGrid items={hubItems} />
      ) : (
        <ParishHubEmptyState isAdmin={isLeader} />
      )}
    </ParishionerPageLayout>
  );
}
