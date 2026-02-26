import type { Metadata } from "next";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { privacyContent } from "@/lib/marketing/legalContent";

export const metadata: Metadata = {
  title: "Privacy | Paxora Parish Center App",
  description: "Privacy policy for Paxora Parish Center App and the Early Access Partner Program.",
  openGraph: { title: "Privacy | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

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
