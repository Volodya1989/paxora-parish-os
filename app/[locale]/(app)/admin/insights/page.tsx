import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslations } from "@/lib/i18n/server";
import { routes } from "@/lib/navigation/routes";

type InsightTile = {
  key: "statistics" | "reports" | "reliability";
  href: string;
};

const insightTiles: InsightTile[] = [
  { key: "statistics", href: routes.adminStatistics },
  { key: "reports", href: routes.adminReports },
  { key: "reliability", href: routes.adminReliability }
];

export default async function AdminInsightsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const { locale: localeParam } = await params;
  const t = getTranslations(getLocaleFromParam(localeParam));

  const parish = await prisma.parish.findUnique({
    where: { id: session.user.activeParishId },
    select: { name: true, logoUrl: true }
  });

  return (
    <ParishionerPageLayout
      pageTitle={t("insights.pageTitle")}
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("insights.subtitle")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {insightTiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className="group rounded-card border border-mist-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg focus-ring"
          >
            <div className="mb-3 inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {t(`insights.badges.${tile.key}`)}
            </div>
            <h2 className="text-base font-semibold text-ink-900">{t(`insights.cards.${tile.key}.title`)}</h2>
            <p className="mt-2 text-sm text-ink-600">{t(`insights.cards.${tile.key}.description`)}</p>
            <div className="mt-4 text-sm font-medium text-primary-700 group-hover:text-primary-800">
              {t("insights.open")}
            </div>
          </Link>
        ))}
      </div>
    </ParishionerPageLayout>
  );
}
