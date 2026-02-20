import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import { getMarketingCopy } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "About | Paxora Parish Center App",
  description: "Mission and story behind the parish management app built for modern parish life.",
  openGraph: { title: "About | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { t } = getMarketingCopy(localeParam);

  return (
    <section className="space-y-4">
      <h1 className="text-h1">{t("marketing.about.title")}</h1>
      <Card className="space-y-3">
        <h2 className="text-h3">{t("marketing.about.missionTitle")}</h2>
        <p className="text-sm text-ink-600">{t("marketing.about.mission")}</p>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-h3">{t("marketing.about.storyTitle")}</h2>
        <p className="text-sm text-ink-600">{t("marketing.about.story")}</p>
      </Card>
    </section>
  );
}
