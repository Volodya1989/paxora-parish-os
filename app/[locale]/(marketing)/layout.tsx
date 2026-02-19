import type { ReactNode } from "react";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import MarketingShell from "@/components/marketing/MarketingShell";

export default async function MarketingLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);

  return <MarketingShell locale={locale}>{children}</MarketingShell>;
}
