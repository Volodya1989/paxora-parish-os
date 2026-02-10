import "./globals.css";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import IosViewportFix from "@/components/ui/IosViewportFix";
import { defaultLocale, localeCookie, locales, type Locale } from "@/lib/i18n/config";
import { getLocalePrefix } from "@/lib/i18n/routing";

export const metadata = {
  title: "Paxora Parish OS",
  description: "Week-first parish coordination"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const prefixedLocale = getLocalePrefix(pathname);
  const cookieLocale = cookieStore.get(localeCookie)?.value;

  const locale: Locale =
    prefixedLocale && prefixedLocale !== "invalid"
      ? prefixedLocale
      : cookieLocale && locales.includes(cookieLocale as Locale)
        ? (cookieLocale as Locale)
        : defaultLocale;

  return (
    <html lang={locale}>
      <body className="min-h-screen">
        <IosViewportFix />
        {children}
      </body>
    </html>
  );
}
