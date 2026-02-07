import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { getAccessGateState } from "@/lib/queries/access";
import { getParishMembership } from "@/server/db/groups";
import { getPostLoginRedirect } from "@/lib/auth/postLoginRedirect";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PostLoginPage({
  params
}: {
  params: { locale: string } | Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await Promise.resolve(params);
  const locale = getLocaleFromParam(localeParam);

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(buildLocalePathname(locale, "/sign-in"));
  }

  if (session.user.isPaxoraSuperAdmin) {
    redirect(buildLocalePathname(locale, "/super-admin"));
  }

  const access = await getAccessGateState();

  if (access.status !== "approved") {
    redirect(buildLocalePathname(locale, "/access"));
  }

  const parishId = access.parishId ?? session.user.activeParishId ?? null;

  if (!parishId) {
    redirect(buildLocalePathname(locale, "/access"));
  }

  const membership = await getParishMembership(parishId, session.user.id);

  if (!membership) {
    redirect(buildLocalePathname(locale, "/access"));
  }

  redirect(getPostLoginRedirect(membership.role, locale));
}
