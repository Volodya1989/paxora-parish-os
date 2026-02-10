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

/**
 * Findings: /profile is the existing account surface with session-gated reads and
 * server actions for profile settings; user-level data lives on User while parish
 * preferences live on Membership. Approach: extend User with month/day dates and
 * greetings opt-in, read via getCurrentUserProfile, and update via a dedicated
 * server action on this page. V2: admin-managed profiles, greeting automation,
 * and explicit leap-year behavior for Feb 29.
 */
export default async function ProfilePage() {
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
      pageTitle="Profile"
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle="Manage your account and personal preferences"
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      icon={<SparklesIcon className="h-6 w-6 text-white" />}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 md:space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Quick actions</p>
              <p className="text-sm text-ink-500">Jump to your most-used profile controls.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="#notification-settings"
                className="inline-flex items-center justify-center rounded-button border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-mist-300 hover:bg-mist-50 focus-ring"
              >
                Notification settings
              </a>
              <a
                href="#important-dates"
                className="inline-flex items-center justify-center rounded-button border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-mist-300 hover:bg-mist-50 focus-ring"
              >
                Important dates
              </a>
            </div>
          </div>
        </Card>

        <ProfileCard name={profile.name} email={profile.email} role={profile.parishRole} />

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
              volunteerHoursOptIn: profile.volunteerHoursOptIn
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
              <CardTitle>Parish Hub</CardTitle>
              <p className="text-sm text-ink-500">
                Configure the parish hub grid for quick access to resources.
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
              <CardTitle>Access requests</CardTitle>
              <p className="text-sm text-ink-500">
                Review and approve incoming parish access requests.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-mist-50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-800">
                      {request.userName ?? "Parishioner"}
                    </div>
                    <div className="text-xs text-ink-500">{request.userEmail}</div>
                  </div>
                  <div className="text-xs text-ink-400">
                    Requested {request.requestedAt.toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form className="flex items-center gap-2" action={approveParishAccess}>
                      <input type="hidden" name="parishId" value={request.parishId} />
                      <input type="hidden" name="userId" value={request.userId} />
                      <select
                        name="role"
                        defaultValue=""
                        required
                        className="w-[160px] rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition focus-ring"
                      >
                        <option value="" disabled>
                          Select role
                        </option>
                        <option value="MEMBER">Parishioner</option>
                        <option value="SHEPHERD">Clergy</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectParishAccess}>
                      <input type="hidden" name="parishId" value={request.parishId} />
                      <input type="hidden" name="userId" value={request.userId} />
                      <Button type="submit" size="sm" variant="secondary">
                        Reject
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
