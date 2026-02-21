import type { Metadata } from "next";
import { APP_STORE_PATHS, APP_STORE_SUPPORT_EMAIL } from "@/lib/mobile/appStoreMetadata";
import { getLocaleFromParam, buildLocalePathname } from "@/lib/i18n/routing";

export const metadata: Metadata = {
  title: "Privacy | Paxora Parish Center App",
  description: "Privacy policy for Paxora Parish Center App and parish data protection practices.",
  openGraph: { title: "Privacy | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const supportPath = buildLocalePathname(locale, APP_STORE_PATHS.support);
  const accountDeletionPath = buildLocalePathname(locale, APP_STORE_PATHS.accountDeletion);

  return (
    <section className="prose max-w-none prose-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Privacy Policy</h1>
      <p>Last updated: February 2026. This policy is provided for pilot operations and is not legal advice.</p>

      <h2>Information we collect</h2>
      <p>
        We collect account information, parish membership data, content submitted in the app, and technical logs needed
        for service reliability and security.
      </p>

      <h2>How we use information</h2>
      <p>
        We use data only to provide and improve Paxora Parish Center App, support parish operations, maintain security,
        and deliver requested service communications.
      </p>

      <h2>Data protection commitment</h2>
      <p>
        We do not sell personal data. We do not misuse parish information. We use trusted service providers such as
        hosting, email, and storage partners only to operate and improve the service.
      </p>

      <h2>Access controls and security practices</h2>
      <p>
        We apply role-based access controls and maintain reasonable administrative, technical, and organizational
        safeguards designed to protect against unauthorized access, disclosure, alteration, or destruction of data.
      </p>
      <p>
        Our infrastructure uses secure hosting practices and encryption in transit, with additional protections and
        monitoring appropriate for a modern cloud application.
      </p>

      <h2>Parish ownership and retention</h2>
      <p>
        Parishes retain ownership of their content and data. Data is retained while a parish remains active in the pilot,
        and authorized parish leaders may request data export or deletion support.
      </p>

      <h2>Account and data deletion</h2>
      <p>
        Any member can start account deletion from the in-app Profile page at <a href={accountDeletionPath}>Delete account</a>.
        The user must type DELETE to confirm. Access to the account ends immediately after confirmation.
      </p>
      <p>
        What is deleted: profile data, sign-in access, and personal account ownership links. Parish records such as events,
        tasks, and messages remain for parish continuity and are reassigned to &quot;Deleted User&quot;.
      </p>
      <p>
        If you need help with a deletion request or parish-level data removal, contact <a href={`mailto:${APP_STORE_SUPPORT_EMAIL}`}>{APP_STORE_SUPPORT_EMAIL}</a>.
        We respond to deletion-related support requests within 7 calendar days.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy requests or questions, email <a href={`mailto:${APP_STORE_SUPPORT_EMAIL}`}>{APP_STORE_SUPPORT_EMAIL}</a>
        or use our <a href={supportPath}>Support page</a>.
      </p>
    </section>
  );
}
