import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppHeader from "@/components/header/AppHeader";
import AppShell from "@/components/navigation/AppShell";
import ParishSetup from "@/components/setup/ParishSetup";
import { authOptions } from "@/server/auth/options";
import { createParish } from "@/server/actions/parish";
import { getAccessGateState } from "@/lib/queries/access";
import { getParishMembership } from "@/server/db/groups";
import { getLocaleFromParam, stripLocale } from "@/lib/i18n/routing";
import { isParishLeader } from "@/lib/permissions";

async function getRequestPathname() {
  const headerList = await headers();
  const nextUrl =
    headerList.get("x-pathname") ??
    headerList.get("x-nextjs-pathname") ??
    headerList.get("x-matched-path") ??
    headerList.get("x-invoke-path") ??
    headerList.get("x-original-url") ??
    headerList.get("x-forwarded-uri") ??
    headerList.get("next-url") ??
    headerList.get("x-next-url") ??
    headerList.get("referer") ??
    "";

  if (!nextUrl) {
    return "";
  }

  try {
    return new URL(nextUrl, "http://localhost").pathname;
  } catch {
    return nextUrl;
  }
}

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

  const pathname = stripLocale(await getRequestPathname());
  const isProfileRoute = pathname.startsWith("/profile");

  if (access.status !== "approved" && !isProfileRoute) {
    redirect(`/${locale}/access`);
  }

  if (access.status !== "approved") {
    return <main className="min-h-screen bg-mist-50 px-4 py-10">{children}</main>;
  }

  const resolvedParishId = access.parishId ?? session.user.activeParishId ?? null;
  const membership = resolvedParishId
    ? await getParishMembership(resolvedParishId, session.user.id)
    : null;

  // Header strategy: AppHeader (with week selector + create controls) is only shown to leaders.
  // Parishioners see page-specific headers (PageHeader) per page.
  // See /components/header/HEADER_STRATEGY.md for details.
  const isLeader = membership ? isParishLeader(membership.role) : false;

  return (
    <AppShell parishRole={membership?.role ?? null}>
      {isLeader && <AppHeader parishRole={membership?.role ?? null} />}
      <main className="flex-1 bg-mist-50 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-8">
        {children}
      </main>
    </AppShell>
  );
}
