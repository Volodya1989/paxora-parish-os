import type { Metadata } from "next";
import ContactForm from "@/components/marketing/ContactForm";
import { getMarketingCopy } from "@/lib/marketing/content";
import { APP_STORE_SUPPORT_EMAIL, APP_STORE_PATHS } from "@/lib/mobile/appStoreMetadata";
import { buildLocalePathname } from "@/lib/i18n/routing";

export const metadata: Metadata = {
  title: "Contact | Paxora Parish Center App",
  description: "Request early access or schedule a guided demo for your parish team.",
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
          {t("marketing.contact.supportLine")} <a className="underline underline-offset-4" href={`mailto:${APP_STORE_SUPPORT_EMAIL}`}>{APP_STORE_SUPPORT_EMAIL}</a>
        </p>
        <p className="mt-2">
          {t("marketing.contact.legalLine")} <a className="underline underline-offset-4" href={privacyPath}>{t("marketing.nav.privacy")}</a> · <a className="underline underline-offset-4" href={termsPath}>{t("marketing.nav.terms")}</a>
        </p>
      </div>
      <ContactForm
        labels={{
          name: t("marketing.contact.form.name"),
          parish: t("marketing.contact.form.parish"),
          email: t("marketing.contact.form.email"),
          message: t("marketing.contact.form.message"),
          submit: t("marketing.contact.form.submit")
        }}
      />
    </section>
  );
}
