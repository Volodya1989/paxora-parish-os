import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { listRequestsForBoard } from "@/lib/queries/requests";
import { getPeopleList } from "@/lib/queries/people";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import RequestsBoard from "@/components/requests/RequestsBoard";

export default async function AdminRequestsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const params = await searchParams;
  const typeParam = typeof params.type === "string" ? params.type : null;
  const type = ["CONFESSION", "LITURGICAL", "PRAYER", "TALK_TO_PRIEST"].includes(typeParam ?? "")
    ? (typeParam as "CONFESSION" | "LITURGICAL" | "PRAYER" | "TALK_TO_PRIEST")
    : null;
  const assigneeId = typeof params.assignee === "string" ? params.assignee : null;
  const scopeParam = typeof params.scope === "string" ? params.scope : null;
  const visibilityScope = ["CLERGY_ONLY", "ADMIN_ALL", "ADMIN_SPECIFIC"].includes(scopeParam ?? "")
    ? (scopeParam as "CLERGY_ONLY" | "ADMIN_ALL" | "ADMIN_SPECIFIC")
    : null;
  const overdue = params.overdue === "true";
  const archived = params.archived === "true";

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
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle="Manage and follow up on parish requests"
    >
      <RequestsBoard requests={requests} assignees={assignees} />
    </ParishionerPageLayout>
  );
}
