import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import PilotBanner from "@/components/marketing/PilotBanner";
import Card from "@/components/ui/Card";
import MarketingMockFrame from "@/components/marketing/MarketingMockFrame";
import { authOptions } from "@/server/auth/options";
import { getMarketingCopy } from "@/lib/marketing/content";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paxora Parish Center App | Parish management app built for modern parish life",
  description: "Parish management app built for modern parish life, with calm weekly coordination for This Week, tasks, events, requests, and parish hub.",
  openGraph: {
    title: "Paxora Parish Center App",
    description: "Parish management app built for modern parish life.",
    images: ["/og/marketing-default.svg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Paxora Parish Center App",
    description: "Parish management app built for modern parish life.",
    images: ["/og/marketing-default.svg"]
  }
};

export default async function MarketingHome({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale: localeParam } = await params;
  const { locale, t } = getMarketingCopy(localeParam);

  if (session?.user?.id) {
    redirect(buildLocalePathname(locale, "/this-week"));
  }

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
        <MarketingMockFrame
          title={t("marketing.hero.mockTitle")}
          subtitle={t("marketing.hero.mockSubtitle")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((key) => (
          <Card key={key}>
            <h2 className="text-h3">{t(`marketing.features.${key}.title`)}</h2>
            <p className="mt-2 text-sm text-ink-600">{t(`marketing.features.${key}.description`)}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
