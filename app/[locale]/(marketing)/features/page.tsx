import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import { getMarketingCopy } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Features | Paxora Parish Center App",
  description: "Explore features in the parish management app built for modern parish life.",
  openGraph: { title: "Features | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function FeaturesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { t } = getMarketingCopy(localeParam);
  const sections = ["thisWeek", "serveTasks", "groupsChat", "calendarEvents", "requests", "rolesPermissions", "notifications", "automatedGreetings", "parishHub"] as const;

  return (
    <section className="space-y-6">
      <h1 className="text-h1">{t("marketing.featuresPage.title")}</h1>
      <p className="text-body">{t("marketing.featuresPage.description")}</p>
      <div className="space-y-4">
        {sections.map((key) => (
          <Card key={key} className="space-y-3">
            <h2 className="text-h3">{t(`marketing.features.${key}.title`)}</h2>
            <p className="text-sm text-ink-600">{t(`marketing.features.${key}.description`)}</p>
                      </Card>
        ))}
      </div>
    </section>
  );
}
