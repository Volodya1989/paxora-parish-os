import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { getRequestDetail } from "@/lib/queries/requests";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatMessageTime } from "@/lib/time/messageTime";
import { buildRequestTimeline, parseRequestDetails } from "@/lib/requests/details";
import { REQUEST_STATUS_TONES } from "@/lib/requests/utils";
import RequestDetailActions from "@/components/requests/RequestDetailActions";
import { getTranslations } from "@/lib/i18n/server";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export default async function RequestDetailPage({
  params
}: {
  params: Promise<{ requestId: string; locale: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const { requestId, locale: localeParam } = await params;
  const t = getTranslations(getLocaleFromParam(localeParam));

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
      pageTitle={t("requests.detail.pageTitle")}
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("requests.detail.subtitle")}
      backHref="/requests"
    >
      <Card className="space-y-4">
        <div className="space-y-1">
          <CardTitle>{request.title}</CardTitle>
          <CardDescription>
            {t(`requests.type.${request.type}.label`)} · {t("requests.list.updatedAt").replace("{time}", formatMessageTime(request.updatedAt))}
          </CardDescription>
          <Badge tone={REQUEST_STATUS_TONES[request.status]}>
            {t(`requests.status.${request.status}`)}
          </Badge>
        </div>

        {request.assignedTo?.name ? (
          <div className="text-sm text-ink-600">{t("requests.list.assignedTo").replace("{name}", request.assignedTo.name)}</div>
        ) : null}

        <RequestDetailActions
          requestId={request.id}
          status={request.status}
          scheduledStart={details?.schedule?.startsAt ?? null}
          scheduledEnd={details?.schedule?.endsAt ?? null}
          scheduleResponseStatus={details?.scheduleResponse?.status ?? null}
          canDeleteOwn={request.createdBy.id === session.user.id}
        />

        {details ? (
          <div className="space-y-2">
            {details.description || details.notes ? (
              <p className="text-sm text-ink-700">{details.description ?? details.notes}</p>
            ) : null}
            {details.preferredTimeWindow ? (
              <p className="text-sm text-ink-700">
                {t("requests.detail.preferredTime")} {details.preferredTimeWindow}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-500">{t("requests.detail.noDetails")}</p>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("requests.detail.timeline")}</h3>
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
              {t("requests.detail.timelineEmpty")}
            </p>
          )}
        </div>
      </Card>
    </ParishionerPageLayout>
  );
}
