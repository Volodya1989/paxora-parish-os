import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { listParishContentReports } from "@/server/actions/content-reports";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import ContentReportsQueue from "@/components/admin/ContentReportsQueue";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslations } from "@/lib/i18n/server";

export default async function AdminReportsPage({
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

  const [reports, parish] = await Promise.all([
    listParishContentReports(),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle={t("moderation.queueTitle")}
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("moderation.queueSubtitle")}
    >
      <div className="section-gap">
        <ContentReportsQueue reports={reports} />
      </div>
    </ParishionerPageLayout>
  );
}
