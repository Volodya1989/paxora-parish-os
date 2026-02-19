import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Paxora Parish OS",
  description: "Pilot privacy overview for Paxora Parish OS.",
  openGraph: { title: "Privacy | Paxora Parish OS", images: ["/og/marketing-default.svg"] },
  twitter: { card: "summary_large_image", images: ["/og/marketing-default.svg"] }
};

export default function PrivacyPage() {
  return (
    <section className="prose max-w-none prose-sm prose-headings:text-ink-900 prose-p:text-ink-700">
      <h1>Privacy Policy</h1>
      <p>Last updated: February 2026. This starter policy is provided for pilot operations and is not legal advice.</p>
      <h2>Information we collect</h2>
      <p>We collect account details, parish membership data, content you submit in the app, and basic technical logs needed for reliability and security.</p>
      <h2>How we use information</h2>
      <p>We use your data to deliver parish coordination features, support pilot onboarding, and send operational communications you request.</p>
      <h2>Data sharing</h2>
      <p>We do not sell personal data. We use service providers (hosting, email, storage) only to operate Paxora Parish OS.</p>
      <h2>Retention and deletion</h2>
      <p>Pilot data is retained while your parish is active and can be deleted upon written request from authorized parish leadership.</p>
      <h2>Contact</h2>
      <p>For privacy questions, contact us via the Contact page.</p>
    </section>
  );
}
