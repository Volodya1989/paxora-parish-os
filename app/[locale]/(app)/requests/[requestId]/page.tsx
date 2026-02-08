import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { getRequestDetail } from "@/lib/queries/requests";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatMessageTime } from "@/lib/time/messageTime";
import { parseRequestDetails } from "@/lib/requests/details";
import {
  getRequestStatusLabel,
  getRequestTypeLabel,
  REQUEST_STATUS_TONES
} from "@/lib/requests/utils";
import RequestDetailActions from "@/components/requests/RequestDetailActions";

export default async function RequestDetailPage({
  params
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const { requestId } = await params;

  const [request, parish] = await Promise.all([
    getRequestDetail(session.user.activeParishId, session.user.id, requestId),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true }
    })
  ]);

  if (!request) {
    notFound();
  }

  const details = parseRequestDetails(request.details);

  return (
    <ParishionerPageLayout
      pageTitle="Request details"
      parishName={parish?.name ?? "My Parish"}
      subtitle="Track the latest updates"
      backHref="/requests"
      actions={
        <Link
          href="/requests"
          className="inline-flex items-center justify-center gap-2 rounded-button border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 focus-ring"
        >
          Back to My Requests
        </Link>
      }
    >
      <Card className="space-y-4">
        <div className="space-y-1">
          <CardTitle>{request.title}</CardTitle>
          <CardDescription>
            {getRequestTypeLabel(request.type)} · Updated {formatMessageTime(request.updatedAt)}
          </CardDescription>
          <Badge tone={REQUEST_STATUS_TONES[request.status]}>
            {getRequestStatusLabel(request.status)}
          </Badge>
        </div>

        {request.assignedTo?.name ? (
          <div className="text-sm text-ink-600">Assigned to {request.assignedTo.name}</div>
        ) : null}

        <RequestDetailActions
          requestId={request.id}
          status={request.status}
          scheduledStart={details?.schedule?.startsAt ?? null}
          scheduledEnd={details?.schedule?.endsAt ?? null}
        />

        {details ? (
          <div className="space-y-2">
            {details.description || details.notes ? (
              <p className="text-sm text-ink-700">{details.description ?? details.notes}</p>
            ) : null}
            {details.preferredTimeWindow ? (
              <p className="text-sm text-ink-700">
                Preferred time window: {details.preferredTimeWindow}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-500">No additional details provided.</p>
        )}
      </Card>
    </ParishionerPageLayout>
  );
}
