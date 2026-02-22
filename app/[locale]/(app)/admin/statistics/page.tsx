import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { getParishEngagementMetrics } from "@/lib/queries/admin-metrics";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { prisma } from "@/server/db/prisma";
import { getTranslations } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";

const allowedRanges = [24, 72, 168, 720] as const;

function StatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-card border border-mist-100 bg-white px-4 py-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-400">{sub}</p> : null}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {description ? <p className="text-xs text-ink-500">{description}</p> : null}
    </div>
  );
}

export default async function AdminStatisticsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const resolvedParams = await params;
  const locale = (resolvedParams.locale ?? "en") as Locale;
  const t = getTranslations(locale);

  const resolvedSearchParams = await searchParams;
  const parsedRange = Number(typeof resolvedSearchParams.range === "string" ? resolvedSearchParams.range : "168");
  const sinceHours = allowedRanges.includes(parsedRange as (typeof allowedRanges)[number])
    ? parsedRange
    : 168;

  const [metrics, parish] = await Promise.all([
    getParishEngagementMetrics({ parishId: session.user.activeParishId, sinceHours }),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle={t("adminStats.pageTitle")}
      parishName={parish?.name ?? t("common.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("adminStats.subtitle")}
    >
      <div className="space-y-6">
        <form className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            {t("adminStats.range")}
            <select name="range" defaultValue={String(sinceHours)} className="rounded border px-2 py-1">
              <option value="24">{t("adminStats.range24h")}</option>
              <option value="72">{t("adminStats.range3d")}</option>
              <option value="168">{t("adminStats.range7d")}</option>
              <option value="720">{t("adminStats.range30d")}</option>
            </select>
          </label>
          <button type="submit" className="rounded border px-3 py-1">
            {t("adminStats.apply")}
          </button>
        </form>

        {/* Members */}
        <div className="space-y-3">
          <SectionHeading
            title={t("adminStats.membersTitle")}
            description={t("adminStats.membersDescription")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("adminStats.totalMembers")}
              value={metrics.members.total}
            />
            <StatCard
              label={t("adminStats.activeMembers")}
              value={metrics.members.activeInPeriod}
              sub={metrics.members.total > 0
                ? `${Math.round((metrics.members.activeInPeriod / metrics.members.total) * 100)}%`
                : undefined}
            />
            <StatCard
              label={t("adminStats.pendingAccess")}
              value={metrics.accessRequests.pending}
            />
          </div>
        </div>

        {/* Tasks / Serve */}
        <div className="space-y-3">
          <SectionHeading
            title={t("adminStats.tasksTitle")}
            description={t("adminStats.tasksDescription")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t("adminStats.openTasks")}
              value={metrics.tasks.open}
            />
            <StatCard
              label={t("adminStats.inProgressTasks")}
              value={metrics.tasks.inProgress}
            />
            <StatCard
              label={t("adminStats.completedTasks")}
              value={metrics.tasks.completed}
            />
            <StatCard
              label={t("adminStats.volunteersActive")}
              value={metrics.tasks.volunteersActive}
              sub={t("adminStats.inPeriod")}
            />
          </div>
        </div>

        {/* Events */}
        <div className="space-y-3">
          <SectionHeading
            title={t("adminStats.eventsTitle")}
            description={t("adminStats.eventsDescription")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("adminStats.eventsInPeriod")}
              value={metrics.events.total}
            />
            <StatCard
              label={t("adminStats.rsvpCount")}
              value={metrics.events.rsvpCount}
            />
            <StatCard
              label={t("adminStats.upcoming")}
              value={metrics.events.upcomingCount}
            />
          </div>
        </div>

        {/* Chat */}
        <div className="space-y-3">
          <SectionHeading
            title={t("adminStats.chatTitle")}
            description={t("adminStats.chatDescription")}
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("adminStats.messages")}
              value={metrics.chat.messageCount}
              sub={t("adminStats.inPeriod")}
            />
            <StatCard
              label={t("adminStats.activeChannels")}
              value={metrics.chat.activeChannels}
            />
          </div>
        </div>

        {/* Requests */}
        <div className="space-y-3">
          <SectionHeading
            title={t("adminStats.requestsTitle")}
            description={t("adminStats.requestsDescription")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("adminStats.totalRequests")}
              value={metrics.requests.total}
            />
            <StatCard
              label={t("adminStats.pendingRequests")}
              value={metrics.requests.pending}
            />
            <StatCard
              label={t("adminStats.completedRequests")}
              value={metrics.requests.completed}
            />
          </div>
        </div>
      </div>
    </ParishionerPageLayout>
  );
}
