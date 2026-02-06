import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/navigation/AppShell";
import ParishSetup from "@/components/setup/ParishSetup";
import { authOptions } from "@/server/auth/options";
import { createParish } from "@/server/actions/parish";
import { getAccessGateState } from "@/lib/queries/access";
import { getParishMembership } from "@/server/db/groups";
import { getLocaleFromParam, stripLocale } from "@/lib/i18n/routing";

export default async function AppLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  const access = await getAccessGateState();

  if (!session.user.activeParishId && !access.parishId) {
    return <ParishSetup action={createParish} userName={session.user.name} />;
  }

  // Access gate: allow profile page for unapproved users
  if (access.status !== "approved") {
    const headerList = await headers();
    const rawPathname = headerList.get("x-pathname") ?? "";
    const pathname = stripLocale(rawPathname);
    const isProfileRoute = pathname.startsWith("/profile");

    if (!isProfileRoute) {
      redirect(`/${locale}/access`);
    }
    return <main className="min-h-screen bg-mist-50 px-4 py-10">{children}</main>;
  }

  const resolvedParishId = access.parishId ?? session.user.activeParishId ?? null;
  const membership = resolvedParishId
    ? await getParishMembership(resolvedParishId, session.user.id)
    : null;

  // No AppHeader — every page now provides its own PageHeader gradient.
  // Same product, same style for all roles.
  return (
    <AppShell parishRole={membership?.role ?? null}>
      <main className="flex-1 bg-mist-50 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-8">
        {children}
      </main>
    </AppShell>
  );
}
