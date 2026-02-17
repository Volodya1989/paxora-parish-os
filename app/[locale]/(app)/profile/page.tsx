import { getServerSession } from "next-auth";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { authOptions } from "@/server/auth/options";
import { getCurrentUserProfile, getProfileSettings } from "@/lib/queries/profile";
import { getPendingAccessRequests } from "@/lib/queries/access";
import { approveParishAccess, rejectParishAccess } from "@/app/actions/access";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileDates from "@/components/profile/ProfileDates";
import ProfileSettings from "@/components/profile/ProfileSettings";
import VolunteerHoursCard from "@/components/profile/VolunteerHoursCard";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { listParishHubItemsForAdmin, ensureParishHubDefaults } from "@/server/actions/parish-hub";
import { prisma } from "@/server/db/prisma";
import ParishHubAdminPanel from "@/components/parish-hub/ParishHubAdminPanel";
import type { ParishHubAdminItem } from "@/components/parish-hub/ParishHubReorderList";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { SparklesIcon } from "@/components/icons/ParishIcons";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

/**
 * Findings: /profile is the existing account surface with session-gated reads and
 * server actions for profile settings; user-level data lives on User while parish
 * preferences live on Membership. Approach: extend User with month/day dates and
 * greetings opt-in, read via getCurrentUserProfile, and update via a dedicated
 * server action on this page. V2: admin-managed profiles, greeting automation,
 * and explicit leap-year behavior for Feb 29.
 */
export default async function ProfilePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileSettings({
    userId: session.user.id,
    parishId: session.user.activeParishId
  });
  const currentProfile = await getCurrentUserProfile();
  const pendingRequests = await getPendingAccessRequests();
  const parish = session.user.activeParishId
    ? await prisma.parish.findUnique({
        where: { id: session.user.activeParishId },
        select: { name: true, logoUrl: true }
      })
    : null;

  // Check if user is admin/shepherd for Parish Hub settings
  const membership = session.user.activeParishId
    ? await getParishMembership(session.user.activeParishId, session.user.id)
    : null;
  const isAdmin = membership ? isParishLeader(membership.role) : false;

  // Load Parish Hub data for admins
  let hubItems: ParishHubAdminItem[] = [];
  let hubGridEnabled = false;
  let hubGridPublicEnabled = false;

  if (isAdmin && session.user.activeParishId) {
    await ensureParishHubDefaults();
    const [items, parishSettings] = await Promise.all([
      listParishHubItemsForAdmin(),
      prisma.parish.findUnique({
        where: { id: session.user.activeParishId },
        select: { hubGridEnabled: true, hubGridPublicEnabled: true }
      })
    ]);
    hubItems = items as ParishHubAdminItem[];
    hubGridEnabled = parishSettings?.hubGridEnabled ?? false;
    hubGridPublicEnabled = parishSettings?.hubGridPublicEnabled ?? false;
  }

  return (
    <ParishionerPageLayout
      pageTitle={t("profile.title")}
      parishName={parish?.name ?? t("serve.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle={t("profile.subtitle")}
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      icon={<SparklesIcon className="h-6 w-6 text-white" />}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 overflow-x-hidden pb-2 md:space-y-5">
        <Card>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{t("profile.quickActions")}</p>
              <p className="text-sm text-ink-500">{t("profile.quickActionsDesc")}</p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
              <a
                href="#notification-settings"
                className="inline-flex w-full min-h-[2.25rem] items-center justify-center rounded-button border border-mist-200 bg-white px-3 py-1.5 text-center text-xs font-medium leading-tight text-ink-900 transition hover:border-mist-300 hover:bg-mist-50 focus-ring whitespace-normal break-words sm:w-auto"
              >
                <span className="min-w-0 truncate">{t("profile.notificationSettings")}</span>
              </a>
              <a
                href="#important-dates"
                className="inline-flex w-full min-h-[2.25rem] items-center justify-center rounded-button border border-mist-200 bg-white px-3 py-1.5 text-center text-xs font-medium leading-tight text-ink-900 transition hover:border-mist-300 hover:bg-mist-50 focus-ring whitespace-normal break-words sm:w-auto"
              >
                <span className="min-w-0 truncate">{t("profile.importantDates")}</span>
              </a>
            </div>
          </div>
        </Card>

        <ProfileCard
          userId={profile.userId}
          name={profile.name}
          email={profile.email}
          role={profile.parishRole}
          avatarUrl={profile.avatarUrl}
        />

        <VolunteerHoursCard
          ytdHours={profile.ytdHours}
          tier={profile.milestoneTier}
          bronzeHours={profile.bronzeHours}
          silverHours={profile.silverHours}
          goldHours={profile.goldHours}
        />

        <div id="notification-settings">
          <ProfileSettings
            initialSettings={{
              notificationsEnabled: profile.notificationsEnabled,
              weeklyDigestEnabled: profile.weeklyDigestEnabled,
              volunteerHoursOptIn: profile.volunteerHoursOptIn,
              notifyMessageInApp: profile.notifyMessageInApp,
              notifyTaskInApp: profile.notifyTaskInApp,
              notifyAnnouncementInApp: profile.notifyAnnouncementInApp,
              notifyEventInApp: profile.notifyEventInApp,
              notifyRequestInApp: profile.notifyRequestInApp,
              notifyMessagePush: profile.notifyMessagePush,
              notifyTaskPush: profile.notifyTaskPush,
              notifyAnnouncementPush: profile.notifyAnnouncementPush,
              notifyEventPush: profile.notifyEventPush,
              notifyRequestPush: profile.notifyRequestPush
            }}
          />
        </div>

        <div id="important-dates">
          <ProfileDates
            initialDates={{
              birthdayMonth: currentProfile.birthdayMonth,
              birthdayDay: currentProfile.birthdayDay,
              anniversaryMonth: currentProfile.anniversaryMonth,
              anniversaryDay: currentProfile.anniversaryDay,
              greetingsOptIn: currentProfile.greetingsOptIn
            }}
          />
        </div>

        {isAdmin && session.user.activeParishId && (
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.parishHub")}</CardTitle>
              <p className="text-sm text-ink-500">
                {t("profile.parishHubDesc")}
              </p>
            </CardHeader>
            <CardContent>
              <ParishHubAdminPanel
                parishId={session.user.activeParishId}
                userId={session.user.id}
                items={hubItems}
                hubGridEnabled={hubGridEnabled}
                hubGridPublicEnabled={hubGridPublicEnabled}
              />
            </CardContent>
          </Card>
        )}

        {pendingRequests.length ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.accessRequests")}</CardTitle>
              <p className="text-sm text-ink-500">
                {t("profile.accessRequestsDesc")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-card border border-mist-200 bg-mist-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-800">
                      {request.userName ?? t("profile.parishioner")}
                    </div>
                    <div className="text-xs text-ink-500">{request.userEmail}</div>
                  </div>
                  <div className="text-xs text-ink-400 sm:text-right">
                    {t("profile.requested")} {request.requestedAt.toLocaleDateString(locale === "uk" ? "uk-UA" : undefined)}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" action={approveParishAccess}>
                      <input type="hidden" name="parishId" value={request.parishId} />
                      <input type="hidden" name="userId" value={request.userId} />
                      <select
                        name="role"
                        defaultValue=""
                        required
                        className="w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition focus-ring sm:w-[160px]"
                      >
                        <option value="" disabled>
                          {t("profile.selectRole")}
                        </option>
                        <option value="MEMBER">{t("profile.parishioner")}</option>
                        <option value="SHEPHERD">{t("profile.clergy")}</option>
                        <option value="ADMIN">{t("profile.admin")}</option>
                      </select>
                      <Button type="submit" size="sm">
                        {t("buttons.approve")}
                      </Button>
                    </form>
                    <form className="w-full sm:w-auto" action={rejectParishAccess}>
                      <input type="hidden" name="parishId" value={request.parishId} />
                      <input type="hidden" name="userId" value={request.userId} />
                      <Button type="submit" size="sm" variant="secondary" className="w-full sm:w-auto">
                        {t("buttons.reject")}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ParishionerPageLayout>
  );
}
