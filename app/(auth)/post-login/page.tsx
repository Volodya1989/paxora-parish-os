import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { getAccessGateState } from "@/lib/queries/access";
import { getParishMembership } from "@/server/db/groups";
import { getPostLoginRedirect } from "@/lib/auth/postLoginRedirect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const access = await getAccessGateState();

  if (access.status !== "approved") {
    redirect("/access");
  }

  const parishId = access.parishId ?? session.user.activeParishId ?? null;

  if (!parishId) {
    redirect("/access");
  }

  const membership = await getParishMembership(parishId, session.user.id);

  if (!membership) {
    redirect("/access");
  }

  redirect(getPostLoginRedirect(membership.role));
}
