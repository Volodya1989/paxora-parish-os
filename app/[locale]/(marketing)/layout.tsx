import type { ReactNode } from "react";
import { getMarketingCopy } from "@/lib/marketing/content";
import { getSiteUrl } from "@/lib/marketing/site";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { APP_STORE_SUPPORT_EMAIL } from "@/lib/mobile/appStoreMetadata";

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
    name: "Paxora Parish Center App",
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/icon.png`
  };

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <MarketingHeader
        locale={locale}
        brandTagline={t("marketing.brandTagline")}
        navLinks={navLinks}
        requestEarlyAccessLabel={t("marketing.cta.requestEarlyAccess")}
        scheduleDemoLabel={t("marketing.cta.scheduleDemo")}
        languageLabel={t("marketing.languageSwitcherLabel")}
      />

      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 md:px-8 md:py-10">{children}</main>

      <MarketingFooter
        locale={locale}
        footerCopy={t("marketing.footer.copy", { year: new Date().getFullYear() })}
        footerLinks={footerLinks}
        supportLabel={t("marketing.footer.supportLabel")}
        supportEmail={APP_STORE_SUPPORT_EMAIL}
      />
    </div>
  );
}
