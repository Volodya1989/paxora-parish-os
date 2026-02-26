import Link from "next/link";
import PilotBanner from "@/components/marketing/PilotBanner";
import Card from "@/components/ui/Card";
import MarketingMockFrame from "@/components/marketing/MarketingMockFrame";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  return buildMarketingMetadata(getLocaleFromParam(localeParam), "home");
}

export default async function MarketingHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { locale, t } = getMarketingCopy(localeParam);


  const features = ["thisWeek", "serveTasks", "groupsChat", "calendarEvents", "requests", "rolesPermissions", "notifications", "automatedGreetings"] as const;

  return (
    <section className="space-y-8">
      <PilotBanner message={t("marketing.pilotBanner")} />
      <div className="grid gap-6 rounded-card border border-mist-200 bg-white p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{t("marketing.hero.eyebrow")}</p>
          <h1 className="text-h1">{t("marketing.hero.title")}</h1>
          <p className="text-body">{t("marketing.hero.description")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={buildLocalePathname(locale, "/sign-up")} className="rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
              {t("marketing.cta.requestEarlyAccess")}
            </Link>
            <Link href={buildLocalePathname(locale, "/demo")} className="rounded-button border border-mist-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-mist-50">
              {t("marketing.cta.scheduleDemo")}
            </Link>
          </div>
        </div>
        <MarketingMockFrame title={t("marketing.hero.mockTitle")} subtitle={t("marketing.hero.mockSubtitle")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((key) => (
          <Card key={key}>
            <h2 className="text-h3">{t(`marketing.features.${key}.title`)}</h2>
            <p className="mt-2 text-sm text-ink-600">{t(`marketing.features.${key}.description`)}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-h3">{t("marketing.home.aboutTitle")}</h2>
          <p className="text-sm text-ink-600">{t("marketing.home.aboutBody")}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-h3">{t("marketing.home.dataTitle")}</h2>
          <p className="text-sm text-ink-600">{t("marketing.home.dataBody")}</p>
        </Card>
      </div>
    </section>
  );
}
