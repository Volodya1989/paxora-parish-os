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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const access = await getAccessGateState();

  if (!session.user.activeParishId && !access.parishId) {
    return <ParishSetup action={createParish} userName={session.user.name} />;
  }

  const pathname = await getRequestPathname();
  const isProfileRoute = pathname.startsWith("/profile");

  if (access.status !== "approved" && !isProfileRoute) {
    redirect("/access");
  }

  if (access.status !== "approved") {
    return <main className="min-h-screen bg-mist-50 px-4 py-10">{children}</main>;
  }

  const resolvedParishId = access.parishId ?? session.user.activeParishId ?? null;
  const membership = resolvedParishId
    ? await getParishMembership(resolvedParishId, session.user.id)
    : null;

  return (
    <AppShell parishRole={membership?.role ?? null}>
      <AppHeader />
      <main className="flex-1 bg-mist-50 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-8">
        {children}
      </main>
    </AppShell>
  );
}
