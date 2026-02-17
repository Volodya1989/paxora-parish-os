import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth/options";
import { listMyRequests } from "@/lib/queries/requests";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import MyRequestsList from "@/components/requests/MyRequestsList";
import { PlusIcon } from "@/components/icons/ParishIcons";
import { getTranslations } from "@/lib/i18n/server";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export default async function MyRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const { locale: localeParam } = await params;
  const t = getTranslations(getLocaleFromParam(localeParam));

  const [requests, parish] = await Promise.all([
    listMyRequests(session.user.activeParishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle={t("requests.page.title")}
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("requests.page.subtitle")}
      backHref="/parish"
      actions={
        <Link
          href="/requests/new"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 focus-ring"
          aria-label={t("requests.page.makeRequest")}
          title={t("requests.page.makeRequest")}
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      <MyRequestsList requests={requests} />
    </ParishionerPageLayout>
  );
}
