import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/provider";
import { getMessages } from "@/lib/i18n/messages";
import { locales, type Locale } from "@/lib/i18n/config";
import LocalePersistence from "@/components/i18n/LocalePersistence";

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <LocalePersistence />
      {children}
    </I18nProvider>
  );
}
