import { getServerSession } from "next-auth";
import PeopleView from "@/components/admin/people/PeopleView";
import { authOptions } from "@/server/auth/options";
import { resolveParishContext } from "@/server/auth/parish-context";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { getParishInvites, getPeopleList } from "@/lib/queries/people";

export default async function AdminPeoplePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const parishContext = await resolveParishContext({
    userId: session.user.id,
    activeParishId: session.user.activeParishId
  });

  if (!parishContext.parishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, parishContext.parishId);

  const [members, invites] = await Promise.all([
    getPeopleList(parishContext.parishId),
    getParishInvites(parishContext.parishId)
  ]);

  return (
    <PeopleView
      members={members}
      invites={invites}
      viewerId={session.user.id}
      parishId={parishContext.parishId}
    />
  );
}
