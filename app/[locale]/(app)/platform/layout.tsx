import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export default async function PlatformLayout({
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

  try {
    await requirePlatformAdmin(session.user.id);
  } catch (error) {
    redirect(`/${locale}/this-week`);
  }

  return children;
}
