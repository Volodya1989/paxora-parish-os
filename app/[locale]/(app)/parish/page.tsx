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
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

/* ── Static featured-panel configuration ─────────────────────────── */
export default async function ParishHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);

  const featuredConfig: FeaturedPanelConfig = {
    title: t("parish.featuredTitle"),
    meta: t("parish.featuredMeta"),
    description: t("parish.featuredDescription"),
    ctaLabel: t("parish.featuredCta"),
    ctaHref: "/parish/bulletin",
    ctaExternal: false
  };

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
      select: { name: true, logoUrl: true }
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
      pageTitle={t("nav.parish")}
      parishName={parish?.name ?? t("serve.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("parish.subtitle")}
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
    >
      {/* Quick-action panel: Make a Request */}
      <div className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50/60 to-white px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-800">{t("parish.needSomething")}</p>
          <p className="text-xs text-ink-500">{t("parish.needSomethingDescription")}</p>
        </div>
        <Link
          href="/requests/new"
          className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {t("parish.request")}
        </Link>
      </div>

      <FeaturedPanel config={featuredConfig} />

      {/* Parish Hub Grid */}
      {hubItems.length > 0 ? (
        <ParishHubGrid items={hubItems} />
      ) : (
        <ParishHubEmptyState isAdmin={isLeader} />
      )}
    </ParishionerPageLayout>
  );
}
