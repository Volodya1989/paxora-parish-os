import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AppHeader from "@/components/header/AppHeader";
import AppShell from "@/components/navigation/AppShell";
import ParishSetup from "@/components/setup/ParishSetup";
import { authOptions } from "@/server/auth/options";
import { createParish } from "@/server/actions/parish";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.activeParishId) {
    return <ParishSetup action={createParish} userName={session.user.name} />;
  }

  return (
    <AppShell>
      <AppHeader />
      <main className="flex-1 bg-mist-50 px-4 py-6 pb-24 md:px-8 md:pb-8">
        {children}
      </main>
    </AppShell>
  );
}
