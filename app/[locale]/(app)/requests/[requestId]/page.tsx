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
import { buildRequestTimeline, parseRequestDetails } from "@/lib/requests/details";
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
      select: { name: true, logoUrl: true }
    })
  ]);

  if (!request) {
    notFound();
  }

  const details = parseRequestDetails(request.details);
  const timelineItems = buildRequestTimeline(details);

  return (
    <ParishionerPageLayout
      pageTitle="Request details"
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
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
          scheduleResponseStatus={details?.scheduleResponse?.status ?? null}
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

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Timeline</h3>
          {timelineItems.length ? (
            <div className="space-y-2">
              {timelineItems.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-card border border-mist-200 bg-white px-3 py-2 text-xs text-ink-600"
                >
                  <p className="font-semibold text-ink-700">{entry.title}</p>
                  <p className="text-[11px] text-ink-400">
                    {new Date(entry.timestamp).toLocaleString()}
                    {entry.meta ? ` · ${entry.meta}` : ""}
                  </p>
                  {entry.note ? <p className="mt-1 text-[11px] text-ink-500">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              Updates from clergy and admins will appear here as your request is processed.
            </p>
          )}
        </div>
      </Card>
    </ParishionerPageLayout>
  );
}
