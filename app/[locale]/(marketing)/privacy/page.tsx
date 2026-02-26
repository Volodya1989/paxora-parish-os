import { getLocaleFromParam } from "@/lib/i18n/routing";
import { privacyContent } from "@/lib/marketing/legalContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  return buildMarketingMetadata(getLocaleFromParam(localeParam), "privacy");
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const content = privacyContent[locale];

  return (
    <section className="prose max-w-none prose-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>{content.title}</h1>
      <p>{content.updated}</p>
      <p>{content.intro}</p>

      {content.sections.map((section) => (
        <div key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ))}
    </section>
  );
}
