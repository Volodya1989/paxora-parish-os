import type { ReactNode } from "react";
import Link from "next/link";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getSiteUrl } from "@/lib/marketing/site";

export default async function MarketingLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const { locale, t, navLinks, footerLinks } = getMarketingCopy(localeParam);
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Paxora Parish OS",
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/icon.png`
  };

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <header className="border-b border-mist-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href={buildLocalePathname(locale, "/")} className="flex items-center gap-3">
            <img src="/icon.png" alt="Paxora logo" className="h-9 w-9 rounded-md object-contain" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Paxora Parish OS</p>
              <p className="text-xs text-ink-500">{t("marketing.brandTagline")}</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-ink-600 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={buildLocalePathname(locale, link.href)} className="hover:text-ink-900">
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href={buildLocalePathname(locale, "/sign-up")}
            className="rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            {t("marketing.cta.requestPilot")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 md:px-8 md:py-10">{children}</main>

      <footer className="border-t border-mist-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-600 md:flex-row md:items-center md:justify-between md:px-8">
          <p>{t("marketing.footer.copy")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {footerLinks.map((link) => (
              <Link key={link.href} href={buildLocalePathname(locale, link.href)} className="hover:text-ink-900">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
