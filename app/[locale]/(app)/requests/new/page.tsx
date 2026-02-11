import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import RequestCreateFlow from "@/components/requests/RequestCreateFlow";
import { getTranslations } from "@/lib/i18n/server";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export default async function NewRequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const { locale: localeParam } = await params;
  const t = getTranslations(getLocaleFromParam(localeParam));

  const [parish, user] = await Promise.all([
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="Make a Request"
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("requests.new.subtitle")}
      backHref="/parish"
    >
      <RequestCreateFlow defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
    </ParishionerPageLayout>
  );
}
