import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { getAccessGateState } from "@/lib/queries/access";
import { getParishMembership } from "@/server/db/groups";
import { getPostLoginRedirect } from "@/lib/auth/postLoginRedirect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PostLoginPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  const access = await getAccessGateState();

  if (access.status !== "approved") {
    redirect(`/${locale}/access`);
  }

  const parishId = access.parishId ?? session.user.activeParishId ?? null;

  if (!parishId) {
    redirect(`/${locale}/access`);
  }

  const membership = await getParishMembership(parishId, session.user.id);

  if (!membership) {
    redirect(`/${locale}/access`);
  }

  redirect(getPostLoginRedirect(membership.role, locale));
}
