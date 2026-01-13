import { getServerSession } from "next-auth";
import SectionTitle from "@/components/ui/SectionTitle";
import { authOptions } from "@/server/auth/options";
import { getProfileSettings } from "@/lib/queries/profile";
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
    </div>
  );
}
