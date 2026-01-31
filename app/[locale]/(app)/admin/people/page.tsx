import { getServerSession } from "next-auth";
import PeopleView from "@/components/admin/people/PeopleView";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { getParishInvites, getPeopleList } from "@/lib/queries/people";

export default async function AdminPeoplePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const [members, invites] = await Promise.all([
    getPeopleList(session.user.activeParishId),
    getParishInvites(session.user.activeParishId)
  ]);

  return (
    <PeopleView
      members={members}
      invites={invites}
      viewerId={session.user.id}
      parishId={session.user.activeParishId}
    />
  );
}
