import { getServerSession } from "next-auth";
import PeopleView from "@/components/admin/people/PeopleView";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { getParishInvites, getPeopleListForAdmin } from "@/lib/queries/people";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { UsersIcon } from "@/components/icons/ParishIcons";
import { prisma } from "@/server/db/prisma";

export default async function AdminPeoplePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const [members, invites, parish] = await Promise.all([
    getPeopleListForAdmin(session.user.id, session.user.activeParishId),
    getParishInvites(session.user.activeParishId),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="People"
      parishName={parish?.name ?? "My parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle="Manage parish members, roles, and invitations with pastoral clarity."
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      icon={<UsersIcon className="h-6 w-6 text-white" />}
    >
      <PeopleView
        members={members}
        invites={invites}
        viewerId={session.user.id}
        parishId={session.user.activeParishId}
      />
    </ParishionerPageLayout>
  );
}
