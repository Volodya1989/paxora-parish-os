import Link from "next/link";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  return buildMarketingMetadata(getLocaleFromParam(localeParam), "demo");
}

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { locale, t } = getMarketingCopy(localeParam);

  return (
    <section className="space-y-5">
      <h1 className="text-h1">{t("marketing.demo.title")}</h1>
      <p className="text-body">{t("marketing.demo.description")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-card border border-mist-200 bg-white p-6 text-sm text-ink-600">
            <p className="font-medium text-ink-900">{t(`marketing.demo.steps.${item}.title`)}</p>
            <p className="mt-2">{t(`marketing.demo.steps.${item}.description`)}</p>
          </div>
        ))}
      </div>
      <Link href={buildLocalePathname(locale, "/contact")} className="inline-flex rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
        {t("marketing.cta.contactUsForDemo")}
      </Link>
    </section>
  );
}
