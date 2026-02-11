import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { listRequestsForBoard } from "@/lib/queries/requests";
import type { RequestType } from "@prisma/client";
import { getPeopleList } from "@/lib/queries/people";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import RequestsBoard from "@/components/requests/RequestsBoard";
import { getTranslations } from "@/lib/i18n/server";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export default async function AdminRequestsPage({
  searchParams,
  params
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const { locale: localeParam } = await params;
  const t = getTranslations(getLocaleFromParam(localeParam));

  const query = await searchParams;
  const typeParam = typeof query.type === "string" ? query.type : null;
  const allowedTypes = ["CONFESSION", "LITURGICAL", "PRAYER", "TALK_TO_PRIEST", "GENERIC"] as const;
  const type = allowedTypes.includes(typeParam as RequestType) ? (typeParam as RequestType) : null;
  const assigneeId = typeof query.assignee === "string" ? query.assignee : null;
  const scopeParam = typeof query.scope === "string" ? query.scope : null;
  const visibilityScope = ["CLERGY_ONLY", "ADMIN_ALL", "ADMIN_SPECIFIC"].includes(scopeParam ?? "")
    ? (scopeParam as "CLERGY_ONLY" | "ADMIN_ALL" | "ADMIN_SPECIFIC")
    : null;
  const overdue = query.overdue === "true";
  const archived = query.archived === "true";

  const [requests, people, parish] = await Promise.all([
    listRequestsForBoard(session.user.activeParishId, session.user.id, {
      type,
      assigneeId,
      visibilityScope,
      overdue,
      archived
    }),
    getPeopleList(session.user.activeParishId),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  const assignees = people.map((person) => ({
    id: person.userId,
    name: person.name,
    email: person.email
  }));

  return (
    <ParishionerPageLayout
      pageTitle="Requests"
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("requests.admin.subtitle")}
    >
      <RequestsBoard requests={requests} assignees={assignees} />
    </ParishionerPageLayout>
  );
}
