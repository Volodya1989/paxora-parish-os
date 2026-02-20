import type { Metadata } from "next";
import ContactForm from "@/components/marketing/ContactForm";
import { getMarketingCopy } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Contact | Paxora Parish Center App",
  description: "Request pilot access or ask for a guided demo.",
  openGraph: { title: "Contact | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const { t } = getMarketingCopy(localeParam);

  return (
    <section className="space-y-4">
      <h1 className="text-h1">{t("marketing.contact.title")}</h1>
      <p className="text-body">{t("marketing.contact.description")}</p>
      <ContactForm />
    </section>
  );
}
