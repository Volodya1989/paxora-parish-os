import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { authOptions } from "@/server/auth/options";
import { SignOutButton } from "@/components/navigation/SignOutButton";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Profile" subtitle="Account details" />

      <Card>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-ink-500">Name</p>
            <p className="text-sm font-medium text-ink-900">
              {session.user.name ?? "Unnamed member"}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Email</p>
            <p className="text-sm font-medium text-ink-900">{session.user.email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-900">Sign out</p>
            <p className="text-sm text-ink-500">End your current session.</p>
          </div>
          <div className="w-40">
            <SignOutButton />
          </div>
        </div>
      </Card>
    </div>
  );
}
