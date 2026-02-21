import type { Metadata } from "next";
import ContactForm from "@/components/marketing/ContactForm";
import { getMarketingCopy } from "@/lib/marketing/content";
import { APP_STORE_SUPPORT_EMAIL, APP_STORE_PATHS } from "@/lib/mobile/appStoreMetadata";
import { buildLocalePathname } from "@/lib/i18n/routing";

export const metadata: Metadata = {
  title: "Contact | Paxora Parish Center App",
  description: "Request pilot access or ask for a guided demo.",
  openGraph: { title: "Contact | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { t, locale } = getMarketingCopy(localeParam);

  const privacyPath = buildLocalePathname(locale, APP_STORE_PATHS.privacy);
  const termsPath = buildLocalePathname(locale, APP_STORE_PATHS.terms);

  return (
    <section className="space-y-4">
      <h1 className="text-h1">{t("marketing.contact.title")}</h1>
      <p className="text-body">{t("marketing.contact.description")}</p>
      <div className="rounded-card border border-mist-200 bg-mist-50 p-4 text-sm text-ink-700">
        <p>
          Support email: <a href={`mailto:${APP_STORE_SUPPORT_EMAIL}`}>{APP_STORE_SUPPORT_EMAIL}</a>
        </p>
        <p className="mt-2">
          Legal: <a href={privacyPath}>Privacy Policy</a> · <a href={termsPath}>Terms of Service</a>
        </p>
      </div>
      <ContactForm />
    </section>
  );
}
