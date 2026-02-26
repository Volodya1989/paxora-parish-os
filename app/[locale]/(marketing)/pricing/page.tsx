import Link from "next/link";
import PilotBanner from "@/components/marketing/PilotBanner";
import Card from "@/components/ui/Card";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  return buildMarketingMetadata(getLocaleFromParam(localeParam), "pricing");
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { locale, t } = getMarketingCopy(localeParam);

  return (
    <section className="space-y-6">
      <h1 className="text-h1">{t("marketing.pricing.title")}</h1>
      <PilotBanner message={t("marketing.pricing.pilotBanner")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-h3">{t("marketing.pricing.tiers.earlyAccess.title")}</h2>
          <p className="mt-2 text-sm text-ink-600">{t("marketing.pricing.tiers.earlyAccess.description")}</p>
        </Card>
        <Card>
          <h2 className="text-h3">{t("marketing.pricing.tiers.pro.title")}</h2>
          <p className="mt-2 text-sm text-ink-600">{t("marketing.pricing.tiers.pro.description")}</p>
        </Card>
      </div>
      <Link href={buildLocalePathname(locale, "/contact")} className="inline-flex rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
        {t("marketing.cta.contactUs")}
      </Link>
    </section>
  );
}
