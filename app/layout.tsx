import "./globals.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import IosViewportFix from "@/components/ui/IosViewportFix";
import { defaultLocale, localeCookie } from "@/lib/i18n/config";

export const metadata = {
  title: "Paxora Parish OS",
  description: "Week-first parish coordination"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = cookies().get(localeCookie)?.value ?? defaultLocale;
  return (
    <html lang={locale}>
      <body className="min-h-screen">
        <IosViewportFix />
        {children}
      </body>
    </html>
  );
}
