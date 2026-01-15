import { getServerSession } from "next-auth";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { authOptions } from "@/server/auth/options";
import { getProfileSettings } from "@/lib/queries/profile";
import { getPendingAccessRequests } from "@/lib/queries/access";
import { approveParishAccess } from "@/app/actions/access";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSettings from "@/components/profile/ProfileSettings";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileSettings({
    userId: session.user.id,
    parishId: session.user.activeParishId
  });
  const pendingRequests = await getPendingAccessRequests();

  return (
    <div className="space-y-6">
      <SectionTitle title="Profile" subtitle="Account details and preferences" />

      <ProfileCard name={profile.name} email={profile.email} role={profile.parishRole} />
      <ProfileSettings
        initialSettings={{
          notificationsEnabled: profile.notificationsEnabled,
          weeklyDigestEnabled: profile.weeklyDigestEnabled
        }}
      />

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
                <form action={approveParishAccess}>
                  <input type="hidden" name="parishId" value={request.parishId} />
                  <input type="hidden" name="userId" value={request.userId} />
                  <input type="hidden" name="role" value="MEMBER" />
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
