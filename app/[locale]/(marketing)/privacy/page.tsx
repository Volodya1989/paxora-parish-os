import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Paxora Parish Center App",
  description: "Privacy policy for Paxora Parish Center App and parish data protection practices.",
  openGraph: { title: "Privacy | Paxora Parish Center App", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default function PrivacyPage() {
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

      <h2>Contact</h2>
      <p>For privacy requests or questions, please contact us through the Contact page.</p>
    </section>
  );
}
