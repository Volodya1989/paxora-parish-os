import type { Metadata } from "next";
import Link from "next/link";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname } from "@/lib/i18n/routing";

export const metadata: Metadata = {
  title: "Demo | Paxora Parish Center App",
  description: "Schedule a guided demo for your parish leadership team.",
  openGraph: { title: "Demo | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { locale, t } = getMarketingCopy(localeParam);

  return (
    <section className="space-y-5">
      <h1 className="text-h1">{t("marketing.demo.title")}</h1>
      <p className="text-body">{t("marketing.demo.description")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-card border border-dashed border-mist-300 bg-mist-100 p-6 text-xs text-ink-500">
            {t("marketing.demo.placeholder")}
          </div>
        ))}
      </div>
      <Link href={buildLocalePathname(locale, "/contact")} className="inline-flex rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
        {t("marketing.cta.contactUsForDemo")}
      </Link>
    </section>
  );
}
